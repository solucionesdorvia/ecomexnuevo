import "dotenv/config";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { calcImportQuote } from "@/lib/quote/calcImportQuote";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";

import {
  type IncomingMessage,
  lastUserMessage,
  extractUrl,
  stripUrlFromText,
  parseUnitPriceUsdWithMode,
  parseQuantityWithMode,
  parseUnitPriceUsdSmart,
  parseQuantitySmart,
  userProvidedUnitPrice,
  looksLikeJustNumber,
  looksLikeProductText,
  looksLikeFreshProductIntent,
  normalizeUrl,
  looksLikeContact,
  contactChannel,
  hasQuoteSignals,
  isAffirmative,
  consultingPostQuoteMessage,
  cleanProductTitleFromMixedInput,
} from "@/lib/chat/chatParsers";

import {
  inferStageHintFromMessages,
  inferSeedForProductFromMessages,
  extractNcmFromText,
  isValidNcmCode,
  parseAssumptionUpdate,
  applyAssumptionUpdate,
  validateNoGuessQuoteInputs,
  buildHiddenChoiceSet,
  deriveBasicNcmQuestions,
  looksLikeNcmDisagreement,
  looksLikeClassificationAnswer,
  tryPickNcmCandidateFromHints,
  shouldSkipTechnicalQuestions,
} from "@/lib/chat/chatInference";

import { buildProductFromInput, ensurePcram } from "@/lib/chat/chatProductBuilder";
import { buildProductPreview, buildAnalysis } from "@/lib/chat/chatResponseHelpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const headerAnon = (req.headers.get("x-ecomex-anon") ?? "").trim();
    const anonId = cookieStore.get("ecomex_anon")?.value || headerAnon || crypto.randomUUID();
    const authToken = cookieStore.get("ecomex_auth")?.value;
    const auth = authToken ? await verifyAuthToken(authToken) : null;
    const userId = auth?.sub ?? null;
    const cookieSecure = (req.headers.get("x-forwarded-proto") ?? "")
      .toLowerCase()
      .startsWith("https");

    const contentType = req.headers.get("content-type") ?? "";
    let body: {
      mode?: "quote" | "budget";
      messages?: IncomingMessage[];
      contact?: string;
    };

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const jsonRaw = form.get("json");
      if (typeof jsonRaw !== "string") {
        return NextResponse.json(
          { assistantMessage: "Falta el campo json en el envío con archivos." },
          { status: 400 }
        );
      }
      try {
        body = JSON.parse(jsonRaw) as typeof body;
      } catch {
        return NextResponse.json({ assistantMessage: "JSON inválido en el formulario." }, { status: 400 });
      }
      const files = form.getAll("invoice").filter((x): x is File => x instanceof File && x.size > 0);
      if (files.length) {
        const { extractInvoiceTextsMerged, stitchInvoiceIntoUserMessage } = await import(
          "@/lib/invoice/extractTextFromInvoiceFile"
        );
        const MAX_BYTES = 12 * 1024 * 1024;
        const MAX_FILES = 8;
        const slice = files.slice(0, MAX_FILES);
        for (const f of slice) {
          if (f.size > MAX_BYTES) {
            return NextResponse.json(
              { assistantMessage: `El archivo "${f.name}" supera el límite de ${MAX_BYTES / 1024 / 1024} MB.` },
              { status: 400 }
            );
          }
        }
        const merged = await extractInvoiceTextsMerged(slice);
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const last = messages[messages.length - 1];
        if (last?.role === "user" && typeof last.content === "string") {
          last.content = stitchInvoiceIntoUserMessage(last.content, merged);
        }
      }
    } else {
      body = (await req.json()) as {
        mode?: "quote" | "budget";
        messages?: IncomingMessage[];
        contact?: string;
      };
    }

    const mode = body.mode === "budget" ? "budget" : "quote";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = lastUserMessage(messages);
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";

    if (!messages.length || !userText) {
      return NextResponse.json(
        { assistantMessage: "Necesito tu mensaje para poder cotizar. Pegá un link del proveedor o describí el producto." },
        { status: 400 }
      );
    }

    const setAnonCookie = (res: NextResponse) => {
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    };

    // If user confirms after seeing a quote, request contact.
    if (isAffirmative(userText) && hasQuoteSignals(messages)) {
      await prisma.quote
        .findFirst({ where: { anonId }, orderBy: { createdAt: "desc" } })
        .then((q) =>
          q ? prisma.quote.update({ where: { id: q.id }, data: { stage: "decision_requested" } }) : null
        )
        .catch(() => null);

      return setAnonCookie(
        NextResponse.json({
          assistantMessage:
            "Perfecto. Para **agendar una consultoría paga** y validar esta importación con un especialista, dejame tu **mail o WhatsApp**.",
          requestContact: true,
        })
      );
    }

    // Contact provided: persist lead and acknowledge.
    if (contact && looksLikeContact(contact)) {
      const lead = await prisma.lead.upsert({
        where: { contact },
        create: { anonId, contact, channel: contactChannel(contact), userId: userId ?? undefined },
        update: { anonId, channel: contactChannel(contact), userId: userId ?? undefined },
      });

      await prisma.quote
        .findFirst({ where: { anonId }, orderBy: { createdAt: "desc" } })
        .then((q) =>
          q
            ? prisma.quote.update({ where: { id: q.id }, data: { leadId: lead.id, stage: "lead_captured" } })
            : null
        )
        .catch(() => null);

      return setAnonCookie(
        NextResponse.json({
          assistantMessage: [
            "Recibido. Un especialista va a tomar tu caso y coordinar la **consultoría paga** por el canal que dejaste.",
            "",
            "En la consultoría validamos:",
            "- clasificación aduanera y alícuotas aplicables",
            "- requisitos/intervenciones y documentación",
            "- riesgos operativos (usados, restricciones, permisos)",
            "- optimización logística (marítimo) y costos",
            "- recomendación final de viabilidad",
            "",
            "Si querés, podés crear una cuenta opcional para ver historial y seguimiento: /account",
          ].join("\n"),
          requestContact: false,
        })
      );
    }

    // Budget mode: single-shot estimation from free text.
    if (mode === "budget") {
      const quote = await calcImportQuote({ mode, budgetText: userText });
      await prisma.quote.create({
        data: {
          anonId, mode, userText,
          quoteJson: quote as never,
          totalMinUsd: quote.totalMinUsd,
          totalMaxUsd: quote.totalMaxUsd,
          userId: userId ?? undefined,
        },
      });
      return setAnonCookie(
        NextResponse.json({
          assistantMessage: `${quote.explanation}\n\n${consultingPostQuoteMessage()}`,
          cards: quote.cards,
          analysis: { stage: "budget_estimate", timing: { route: "maritime", minDays: 35, maxDays: 55 } },
          requestContact: false,
        })
      );
    }

    // Load active (in-progress) quote row for this anonymous session.
    const active = await prisma.quote
      .findFirst({
        where: {
          anonId,
          mode: "quote",
          stage: { in: ["awaiting_product", "awaiting_price", "awaiting_quantity"] },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null);

    const stageHint = inferStageHintFromMessages(messages);
    const seedForProduct = inferSeedForProductFromMessages(messages);

    const urlInText = extractUrl(userText);
    const userTextSansUrl = stripUrlFromText(userText, urlInText);

    const priceUsdStrict = parseUnitPriceUsdWithMode(userTextSansUrl, { allowBareNumber: false });
    const quantityStrict = parseQuantityWithMode(userTextSansUrl, { allowBareNumber: false });
    let priceUsd: number | null = priceUsdStrict ?? parseUnitPriceUsdSmart(userTextSansUrl);
    let quantity: number | null = quantityStrict ?? parseQuantitySmart(userTextSansUrl);

    if (priceUsd == null && stageHint === "awaiting_price" && looksLikeJustNumber(userTextSansUrl)) {
      const loose = parseUnitPriceUsdWithMode(userTextSansUrl, { allowBareNumber: true });
      if (typeof loose === "number") priceUsd = loose;
    }
    if (quantity == null && stageHint === "awaiting_quantity" && looksLikeJustNumber(userTextSansUrl)) {
      const qLoose = parseQuantityWithMode(userTextSansUrl, { allowBareNumber: true });
      if (typeof qLoose === "number") quantity = qLoose;
    }

    const disagreesWithNcm = looksLikeNcmDisagreement(userTextSansUrl);
    const explicitNcm = disagreesWithNcm ? null : extractNcmFromText(userTextSansUrl);

    // ---------- Helper closures (depend on anonId, userId, userText, cookieSecure) ----------

    const ask = (
      assistantMessage: string,
      product?: Record<string, unknown>,
      opts?: { stage?: string; questions?: string[] }
    ) =>
      setAnonCookie(
        NextResponse.json({
          assistantMessage,
          requestContact: false,
          productPreview: product ? buildProductPreview(product) : undefined,
          analysis: {
            stage: opts?.stage ?? "needs_input",
            questions: Array.isArray(opts?.questions)
              ? opts.questions.map((q) => String(q || "").trim()).filter(Boolean).slice(0, 6)
              : undefined,
          },
        })
      );

    const quoteAndRespond = async (quoteRowId: string | null, product: Record<string, unknown>) => {
      const product2 = await ensurePcram(product);
      const isLinkContext = Boolean(
        typeof product2?.url === "string" ||
          typeof product2?.sourceUrl === "string" ||
          typeof (product2?.raw as Record<string, unknown> | undefined)?.urlAnalysis === "object"
      );

      const meta = (product2?.raw as Record<string, unknown> | undefined)?.ncmMeta as Record<string, unknown> | undefined;
      const candidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(meta?.pcramCandidates)
        ? meta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
        : [];
      const qsFromMeta: string[] = Array.isArray(meta?.missingInfoQuestions)
        ? (meta!.missingInfoQuestions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
        : [];
      const qs = qsFromMeta.length
        ? qsFromMeta
        : deriveBasicNcmQuestions({ hsHeading: meta?.hsHeading as string | undefined, kind: meta?.kind as string | undefined, candidates });

      // shouldAskNcmQuestions is intentionally false — system resolves NCM internally.
      const shouldAskNcmQuestions = false;

      if (shouldAskNcmQuestions) {
        const { hidden } = buildHiddenChoiceSet(candidates, product2?.ncm as string | undefined, 5);
        product2.raw = { ...((product2.raw as Record<string, unknown>) ?? {}), ncmChoiceOptions: hidden, ncmDisambiguationAsked: true };
        if (quoteRowId) {
          await prisma.quote.update({ where: { id: quoteRowId }, data: { productJson: product2 as never, stage: "awaiting_product" } }).catch(() => null);
        } else {
          await prisma.quote.create({ data: { anonId, mode: "quote", userText, sourceUrl: urlInText ?? undefined, productJson: product2 as never, quoteJson: { awaiting: "ncm_disambiguation" } as never, stage: "awaiting_product", userId: userId ?? undefined } }).catch(() => null);
        }
        return ask(
          ["Para **clasificar el NCM** con precisión necesito afinar 1–3 datos técnicos.", "", "Respondeme esto (una sola línea está perfecto):", ...qs.map((q) => `- ${q}`)].join("\n"),
          product2,
          { stage: "needs_ncm_details", questions: qs }
        );
      }

      const noGuessGate = validateNoGuessQuoteInputs(product2, { requireNcm: !isLinkContext });
      if (!noGuessGate.ok) {
        if (quoteRowId) {
          await prisma.quote.update({ where: { id: quoteRowId }, data: { productJson: product2 as never, stage: "awaiting_product" } }).catch(() => null);
        }
        return ask(
          ["Para darte una cotización precisa necesito:", "", ...noGuessGate.questions.map((q) => `- ${q}`), "", "Con eso te doy el desglose completo."].join("\n"),
          product2,
          { stage: "needs_verified_inputs", questions: noGuessGate.questions }
        );
      }

      const quote = await calcImportQuote({ mode: "quote", product: product2, rawUserText: userText });

      if (quoteRowId) {
        await prisma.quote.update({
          where: { id: quoteRowId },
          data: { productJson: product2 as never, quoteJson: quote as never, totalMinUsd: quote.totalMinUsd, totalMaxUsd: quote.totalMaxUsd, stage: "refined" },
        }).catch(() => null);
      } else {
        await prisma.quote.create({
          data: { anonId, mode: "quote", userText, sourceUrl: urlInText ?? undefined, productJson: product2 as never, quoteJson: quote as never, totalMinUsd: quote.totalMinUsd, totalMaxUsd: quote.totalMaxUsd, stage: "quoted", userId: userId ?? undefined },
        }).catch(() => null);
      }

      const ncmUsed =
        typeof product2?.ncm === "string" && (product2.ncm as string).trim()
          ? (product2.ncm as string).trim() !== "9999.99.99"
            ? (product2.ncm as string).trim()
            : undefined
          : undefined;

      return setAnonCookie(
        NextResponse.json({
          assistantMessage: `${quote.explanation}\n\n${consultingPostQuoteMessage()}`,
          cards: quote.cards,
          productPreview: buildProductPreview(product2),
          ncm: ncmUsed,
          quality: typeof (quote as Record<string, unknown>).quality === "number" ? (quote as Record<string, unknown>).quality : undefined,
          assumptions: Array.isArray((quote as Record<string, unknown>).assumptions) ? (quote as Record<string, unknown>).assumptions : undefined,
          breakdown: (quote as Record<string, unknown>)?.breakdown,
          analysis: buildAnalysis(product2, userText, quote as Record<string, unknown>),
          requestContact: false,
        })
      );
    };

    // ---------- NCM disagreement: reopen last quote for re-classification ----------

    if (!active && disagreesWithNcm) {
      const last = await prisma.quote.findFirst({ where: { anonId, mode: "quote" }, orderBy: { createdAt: "desc" } }).catch(() => null);
      if (last) {
        const product = ((last.productJson as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        delete product.ncm;
        if (product?.raw) {
          const raw = product.raw as Record<string, unknown>;
          delete raw.pcram;
          if (raw.ncmMeta) (raw.ncmMeta as Record<string, unknown>).ambiguous = true;
        }

        const seedText = String(product?.title ?? last.userText ?? "").trim();
        if (seedText) {
          const useNcmMotorDisagree = process.env.NCM_CHAT_USE_MOTOR_IN_BUILD_PRODUCT === "1";
          if (useNcmMotorDisagree) {
            const { runNcmMotor } = await import("@/lib/clasificar-ncm/runNcmMotor");
            const motor = await runNcmMotor({ text: seedText, snapshot: { productType: "unknown", status: "idle" }, prevSnapshot: { productType: "unknown", status: "idle" }, messages: [] }).catch(() => null);
            if (motor) {
              const rawNext: Record<string, unknown> = { ...((product.raw as Record<string, unknown>) ?? {}) };
              if (motor.engine.mode === "full") {
                const pl = motor.engine.pipeline;
                if (pl.ncmMeta) rawNext.ncmMeta = pl.ncmMeta;
                if (pl.pcram) rawNext.pcram = pl.pcram;
              }
              rawNext.ncmMotor = { confidence: motor.confidence, alternatives: motor.alternatives, ambiguity: motor.ambiguity ?? null };
              product.raw = rawNext;
            } else {
              const { productFromTextPipeline } = await import("@/lib/scraper/productFromTextPipeline");
              const extra = (await productFromTextPipeline(seedText).catch(() => ({}))) as Record<string, unknown>;
              if (extra?.ncmMeta) product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmMeta: extra.ncmMeta };
            }
          } else {
            const { productFromTextPipeline } = await import("@/lib/scraper/productFromTextPipeline");
            const extra = (await productFromTextPipeline(seedText).catch(() => ({}))) as Record<string, unknown>;
            if (extra?.ncmMeta) product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmMeta: extra.ncmMeta };
          }
        }

        const candidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(
          (product?.raw as Record<string, unknown> | undefined)?.ncmMeta &&
            ((product.raw as Record<string, unknown>).ncmMeta as Record<string, unknown>)?.pcramCandidates
        )
          ? ((product.raw as Record<string, unknown>).ncmMeta as Record<string, unknown>).pcramCandidates as Array<{ ncmCode: string; title?: string }>
          : [];

        if (candidates.length) {
          const { hidden } = buildHiddenChoiceSet(candidates, product?.ncm as string | undefined, 5);
          product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmChoiceOptions: hidden };
          await prisma.quote.update({ where: { id: last.id }, data: { productJson: product as never, stage: "awaiting_product" } }).catch(() => null);
          return setAnonCookie(
            NextResponse.json({
              assistantMessage: ["Perfecto, lo recalculamos.", "", "Para estimar **impuestos** con precisión necesito afinar 1–3 datos técnicos del producto.", "Respondeme con lo que sepas (en una sola línea está perfecto)."].join("\n"),
              requestContact: false,
            })
          );
        }
      }
    }

    // ---------- Refinement: update origin/shippingProfile on last quote ----------

    if (!active && mode === "quote") {
      const upd = parseAssumptionUpdate(userText);
      if (upd) {
        const last = await prisma.quote.findFirst({ where: { anonId, mode: "quote" }, orderBy: { createdAt: "desc" } }).catch(() => null);
        if (last) {
          const product = ((last.productJson as Record<string, unknown>) ?? {}) as Record<string, unknown>;
          applyAssumptionUpdate(product, upd);
          return await quoteAndRespond(last.id, product);
        }
      }
    }

    // ---------- Active quote: continue guided flow ----------

    if (active) {
      const product = ((active.productJson as Record<string, unknown>) ?? {}) as Record<string, unknown>;
      const existingUrl =
        typeof product?.url === "string" ? product.url as string
          : typeof product?.sourceUrl === "string" ? product.sourceUrl as string
          : "";
      const sameUrl =
        urlInText && existingUrl
          ? normalizeUrl(urlInText) === normalizeUrl(existingUrl)
          : false;

      if (typeof priceUsd === "number") { product.fobUsd = priceUsd; product.currency = "USD"; }
      if (typeof quantity === "number") { product.quantity = quantity; }

      if (active.stage === "awaiting_product") {
        if (disagreesWithNcm) {
          delete product.ncm;
          if (product?.raw) {
            const raw = product.raw as Record<string, unknown>;
            delete raw.pcram;
            if (raw.ncmMeta) (raw.ncmMeta as Record<string, unknown>).ambiguous = true;
          }
          const hasCandidates = Array.isArray((product?.raw as Record<string, unknown> | undefined)?.ncmMeta && ((product.raw as Record<string, unknown>).ncmMeta as Record<string, unknown>)?.pcramCandidates);
          if (!hasCandidates) {
            const built = await buildProductFromInput(String(product?.title ?? ""));
            Object.assign(product, built);
          }
          await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
        }

        const prevHidden: Array<{ ncmCode: string; title?: string }> = Array.isArray((product?.raw as Record<string, unknown> | undefined)?.ncmChoiceOptions)
          ? (product.raw as Record<string, unknown>).ncmChoiceOptions as Array<{ ncmCode: string; title?: string }>
          : [];
        const isTechAnswer = prevHidden.length > 0 && !urlInText && looksLikeClassificationAnswer(userText);
        let resolvedViaTechAnswer = false;

        if (prevHidden.length) {
          const hinted = tryPickNcmCandidateFromHints(prevHidden, userText);
          if (hinted?.ncmCode) {
            product.ncm = hinted.ncmCode;
            const raw = product.raw as Record<string, unknown> | undefined;
            if (raw?.ncmMeta) (raw.ncmMeta as Record<string, unknown>).ambiguous = false;
            delete (product.raw as Record<string, unknown>).ncmChoiceOptions;
            await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
            resolvedViaTechAnswer = true;
          }
        }

        if (isTechAnswer && !resolvedViaTechAnswer && (product?.raw as Record<string, unknown> | undefined)?.ncmDisambiguationAsked === true) {
          const seed = String(product?.title ?? "").trim();
          const combined = [seed, userText].filter(Boolean).join("\n");
          if (combined.trim().length >= 8) {
            const useNcmMotorInDisambig = process.env.NCM_CHAT_USE_MOTOR_IN_BUILD_PRODUCT === "1";
            if (useNcmMotorInDisambig) {
              const { runNcmMotor } = await import("@/lib/clasificar-ncm/runNcmMotor");
              const prevAmb = ((product?.raw as Record<string, unknown> | undefined)?.ncmMotor as Record<string, unknown> | undefined)?.ambiguity;
              const ncmHint = typeof product?.ncm === "string" ? (product.ncm as string).trim() : "";
              const motor = await runNcmMotor({
                text: combined,
                snapshot: { productType: "unknown", status: "idle", ...(ncmHint ? { recommendedNcm: ncmHint } : {}) },
                prevSnapshot: { productType: "unknown", status: "idle", ...(prevAmb != null && typeof prevAmb === "object" ? { ambiguity: prevAmb as never } : {}) },
                messages: [{ id: "ncm-disambiguation", role: "user" as const, content: userText, ts: Date.now() }],
              }).catch(() => null);

              if (motor) {
                const rawNext: Record<string, unknown> = { ...((product.raw as Record<string, unknown>) ?? {}) };
                if (motor.engine.mode === "full") {
                  const pl = motor.engine.pipeline;
                  if (pl.ncmMeta) rawNext.ncmMeta = pl.ncmMeta;
                  if (pl.pcram) rawNext.pcram = pl.pcram;
                }
                rawNext.ncmMotor = { confidence: motor.confidence, alternatives: motor.alternatives, ambiguity: motor.ambiguity ?? null };
                delete rawNext.ncmChoiceOptions;
                product.raw = rawNext;
                if (motor.ncm_code) product.ncm = motor.ncm_code;
              } else {
                const { productFromTextPipeline } = await import("@/lib/scraper/productFromTextPipeline");
                const extra = (await productFromTextPipeline(combined).catch(() => ({}))) as Record<string, unknown>;
                if (extra?.ncm) product.ncm = extra.ncm;
                if (extra?.pcram) product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), pcram: extra.pcram };
                if (extra?.ncmMeta) product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmMeta: extra.ncmMeta };
                delete (product.raw as Record<string, unknown>).ncmChoiceOptions;
              }
            } else {
              const { productFromTextPipeline } = await import("@/lib/scraper/productFromTextPipeline");
              const extra = (await productFromTextPipeline(combined).catch(() => ({}))) as Record<string, unknown>;
              if (extra?.ncm) product.ncm = extra.ncm;
              if (extra?.pcram) product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), pcram: extra.pcram };
              if (extra?.ncmMeta) product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmMeta: extra.ncmMeta };
              delete (product.raw as Record<string, unknown>).ncmChoiceOptions;
            }
            await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
            resolvedViaTechAnswer = Boolean(product?.ncm);
          }
        }

        if (isTechAnswer && (resolvedViaTechAnswer || Boolean(product?.ncm))) {
          await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
          if (typeof product.fobUsd !== "number") {
            await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_price" } }).catch(() => null);
            return ask("Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)", product);
          }
          if (typeof product.quantity !== "number") {
            await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } }).catch(() => null);
            return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500`)", product);
          }
          return await quoteAndRespond(active.id, product);
        }

        const ncmMeta = (product?.raw as Record<string, unknown> | undefined)?.ncmMeta as Record<string, unknown> | undefined;
        const candidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(ncmMeta?.pcramCandidates)
          ? ncmMeta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
          : [];
        const ncmUnresolved = !product?.ncm || ncmMeta?.ambiguous === true;
        const qsNowFromMeta: string[] = Array.isArray(ncmMeta?.missingInfoQuestions)
          ? (ncmMeta!.missingInfoQuestions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
          : [];
        const qsNow = qsNowFromMeta.length
          ? qsNowFromMeta
          : deriveBasicNcmQuestions({ hsHeading: ncmMeta?.hsHeading as string | undefined, kind: ncmMeta?.kind as string | undefined, candidates });

        if (candidates.length >= 2 && ncmUnresolved) {
          if (shouldSkipTechnicalQuestions(product)) {
            if (typeof product.fobUsd !== "number") {
              await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_price" } }).catch(() => null);
              return ask("Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)", product);
            }
            if (typeof product.quantity !== "number") {
              await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } }).catch(() => null);
              return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500`)", product);
            }
            return await quoteAndRespond(active.id, product);
          }

          if (explicitNcm) {
            product.ncm = explicitNcm;
          } else {
            const t = userText.toLowerCase();
            const pick = (pred: (title: string) => boolean) => candidates.find((c) => pred(String(c.title ?? "")));
            const isParts = /(parte|partes|repuesto|repuestos|componente|componentes)/i.test(t);
            const isComplete = /(completo|equipo|maquina|máquina|unidad)/i.test(t);
            if (isParts) {
              const c = pick((title) => /partes?|repuestos?/i.test(title)) ?? pick((title) => /^de\s+ascensor/i.test(title));
              if (c) product.ncm = c.ncmCode;
            } else if (isComplete) {
              const c = pick((title) => /ascensor|montacarg|elevador/i.test(title) && !/partes?/i.test(title)) ?? candidates[0];
              if (c) product.ncm = c.ncmCode;
            }
          }

          if (product?.ncm && ncmMeta) ncmMeta.ambiguous = false;

          if (!product?.ncm) {
            const { hidden } = buildHiddenChoiceSet(candidates, product?.ncm as string | undefined, 5);
            product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmChoiceOptions: hidden, ncmDisambiguationAsked: true };
            await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
            const qs: string[] = Array.isArray(ncmMeta?.missingInfoQuestions)
              ? (ncmMeta!.missingInfoQuestions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
              : [];
            if (qs.length) {
              return ask(
                ["Para estimar **impuestos** con precisión, necesito afinar 1–3 datos técnicos.", "", ["Respondeme esto (podés contestar en una sola línea, por ejemplo: `<=5t, no basculante, no frigorifico`):", ...qs.map((q) => `- ${q}`), ""].join("\n"), "Con eso ajusto la clasificación internamente y seguimos con el precio/cantidad."].filter(Boolean).join("\n")
              );
            }
          }

          await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);

          if (product?.ncm && !(urlInText || (looksLikeProductText(userText) && !isTechAnswer))) {
            if (typeof product.fobUsd !== "number") {
              await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_price" } }).catch(() => null);
              return ask("Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)");
            }
            if (typeof product.quantity !== "number") {
              await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } }).catch(() => null);
              return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)");
            }
            return await quoteAndRespond(active.id, product);
          }
        }

        if (urlInText || looksLikeProductText(userText)) {
          if (!isTechAnswer) {
            const built = await buildProductFromInput(userText);
            const merged: Record<string, unknown> = { ...product, ...built };
            if (typeof product?.fobUsd === "number") merged.fobUsd = product.fobUsd;
            if (typeof product?.quantity === "number") merged.quantity = product.quantity;
            if (typeof product?.currency === "string") merged.currency = product.currency;
            await prisma.quote.update({ where: { id: active.id }, data: { productJson: merged as never } }).catch(() => null);

            const mergedMeta = (merged?.raw as Record<string, unknown> | undefined)?.ncmMeta as Record<string, unknown> | undefined;
            const mergedCandidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(mergedMeta?.pcramCandidates)
              ? mergedMeta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
              : [];
            const qsMergedFromMeta: string[] = Array.isArray(mergedMeta?.missingInfoQuestions)
              ? (mergedMeta!.missingInfoQuestions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
              : [];
            const qsMerged = qsMergedFromMeta.length
              ? qsMergedFromMeta
              : deriveBasicNcmQuestions({ hsHeading: mergedMeta?.hsHeading as string | undefined, kind: mergedMeta?.kind as string | undefined, candidates: mergedCandidates });

            if (typeof merged.fobUsd !== "number") {
              await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_price" } }).catch(() => null);
              return ask("Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)");
            }
            if (typeof merged.quantity !== "number") {
              await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } }).catch(() => null);
              return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)");
            }
            return await quoteAndRespond(active.id, merged);
          }
        }

        const hasContext =
          typeof product?.title === "string" ||
          typeof product?.url === "string" ||
          typeof product?.sourceUrl === "string";
        if (hasContext) {
          await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
          if (typeof product.fobUsd !== "number") {
            await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_price" } }).catch(() => null);
            return ask("Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)", product);
          }
          if (typeof product.quantity !== "number") {
            await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } }).catch(() => null);
            return ask("Gracias. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)", product);
          }
          return await quoteAndRespond(active.id, product);
        }

        return ask("Decime **qué producto** querés importar (o pegá el link del proveedor). Ej: `autoelevador eléctrico 3T`.");
      }

      if (active.stage === "awaiting_price") {
        const hardPrice = parseUnitPriceUsdWithMode(userText, { allowBareNumber: false });
        const hardQty = parseQuantityWithMode(userText, { allowBareNumber: false });
        const looksLikeNewProduct =
          (urlInText || looksLikeProductText(userText)) && !sameUrl && hardPrice == null && hardQty == null && !looksLikeJustNumber(userText);

        if (looksLikeNewProduct) {
          const built = await buildProductFromInput(userText);
          if (!urlInText) { delete (built as Record<string, unknown>).fobUsd; delete (built as Record<string, unknown>).currency; }
          delete (built as Record<string, unknown>).quantity;
          await prisma.quote.update({
            where: { id: active.id },
            data: { productJson: built as never, stage: typeof (built as Record<string, unknown>).fobUsd === "number" ? "awaiting_quantity" : "awaiting_price" },
          }).catch(() => null);
          if (typeof (built as Record<string, unknown>).fobUsd === "number") {
            if (typeof (built as Record<string, unknown>).quantity !== "number") return ask("Perfecto. ¿Cuál es la **cantidad** a importar? (ej: `500`)", built as Record<string, unknown>);
            return await quoteAndRespond(active.id, built as Record<string, unknown>);
          }
          return ask("Perfecto. ¿Cuál es el **precio unitario** del producto en **USD**? (ej: `USD 120`)", built as Record<string, unknown>);
        }

        if (urlInText) {
          const built = await buildProductFromInput(userText);
          Object.assign(product, built);
        }

        if (typeof product.fobUsd !== "number") {
          const loosePrice = parseUnitPriceUsdWithMode(userText, { allowBareNumber: true });
          if (typeof loosePrice === "number") { product.fobUsd = loosePrice; product.currency = "USD"; }
        }

        if (typeof product.fobUsd !== "number") {
          return ask("Necesito el **precio unitario en USD** para calcular el total. Ej: `USD 120` (si ponés solo el número, asumimos USD).", product);
        }
        await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);

        if (typeof product.quantity !== "number") {
          await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_quantity" } }).catch(() => null);
          return ask("Perfecto. ¿Cuál es la **cantidad** a importar? (ej: `500`)", product);
        }
        return await quoteAndRespond(active.id, product);
      }

      if (active.stage === "awaiting_quantity") {
        const qNow = userProvidedUnitPrice(userTextSansUrl)
          ? null
          : parseQuantityWithMode(userTextSansUrl, { allowBareNumber: true });

        if (qNow == null && (urlInText || looksLikeProductText(userText)) && !sameUrl && !looksLikeJustNumber(userText)) {
          const built = await buildProductFromInput(userText);
          if (!urlInText) { delete (built as Record<string, unknown>).fobUsd; delete (built as Record<string, unknown>).currency; }
          delete (built as Record<string, unknown>).quantity;
          Object.assign(product, built);

          const builtMeta = (built as Record<string, unknown>)?.raw && ((built as Record<string, unknown>).raw as Record<string, unknown>)?.ncmMeta as Record<string, unknown> | undefined;
          const builtCandidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(builtMeta?.pcramCandidates)
            ? builtMeta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
            : [];

          if (!urlInText && builtCandidates.length >= 2 && (builtMeta?.ambiguous === true || !product?.ncm)) {
            const { hidden } = buildHiddenChoiceSet(builtCandidates, product?.ncm as string | undefined, 5);
            product.raw = { ...((product.raw as Record<string, unknown>) ?? {}), ncmChoiceOptions: hidden };
            await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never, stage: "awaiting_product" } }).catch(() => null);
            const qs: string[] = Array.isArray(builtMeta?.missingInfoQuestions)
              ? (builtMeta!.missingInfoQuestions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
              : [];
            return ask(
              ["Ok. Cambiemos de producto.", "", "Para estimar **impuestos** con precisión, necesito afinar 1–3 datos técnicos.", "", qs.length ? ["Respondeme esto (podés contestar en una sola línea):", ...qs.map((q) => `- ${q}`), ""].join("\n") : "", "Con eso ajusto la clasificación internamente y seguimos con el precio/cantidad."].filter(Boolean).join("\n"),
              product
            );
          }
          await prisma.quote.update({ where: { id: active.id }, data: { productJson: product as never } }).catch(() => null);
        }

        if (typeof product.quantity !== "number" && !userProvidedUnitPrice(userText)) {
          const qLoose = parseQuantityWithMode(userText, { allowBareNumber: true });
          if (typeof qLoose === "number") product.quantity = qLoose;
        }

        if (typeof product.quantity !== "number") return ask("Necesito la **cantidad**. Ej: `500 unidades`.", product);
        if (typeof product.fobUsd !== "number") {
          await prisma.quote.update({ where: { id: active.id }, data: { stage: "awaiting_price" } }).catch(() => null);
          return ask("Antes de calcular, decime el **precio unitario en USD**. Ej: `USD 120`.", product);
        }
        return await quoteAndRespond(active.id, product);
      }
    }

    // ---------- Fresh start: no active quote row ----------

    const seedText = looksLikeFreshProductIntent(userText) ? userText : seedForProduct ?? userText;
    const url = extractUrl(seedText);
    const initialProductProvided = url != null || looksLikeProductText(seedText);
    const initial: Record<string, unknown> = {};
    if (typeof priceUsd === "number") { initial.fobUsd = priceUsd; initial.currency = "USD"; }
    if (typeof quantity === "number") initial.quantity = quantity;

    if (!initialProductProvided) {
      await prisma.quote.create({
        data: { anonId, mode: "quote", userText, productJson: initial as never, quoteJson: { awaiting: "product" } as never, stage: "awaiting_product", userId: userId ?? undefined },
      }).catch(() => null);
      return ask("Dale. Ahora decime **qué producto** querés importar (o pegá el link). Ej: `autoelevador eléctrico industrial`.");
    }

    const built = await (async () => {
      const b = await buildProductFromInput(seedText) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...b, ...initial };
      if (b?.price && typeof b.price === "object") merged.price = b.price;
      if (typeof b?.fobUsd === "number") merged.fobUsd = b.fobUsd;
      if (typeof b?.currency === "string") merged.currency = b.currency;
      return merged;
    })();

    const builtMeta = (built?.raw as Record<string, unknown> | undefined)?.ncmMeta as Record<string, unknown> | undefined;
    const builtCandidates: Array<{ ncmCode: string; title?: string }> = Array.isArray(builtMeta?.pcramCandidates)
      ? builtMeta!.pcramCandidates as Array<{ ncmCode: string; title?: string }>
      : [];
    const qsBuiltFromMeta: string[] = Array.isArray(builtMeta?.missingInfoQuestions)
      ? (builtMeta!.missingInfoQuestions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
      : [];
    const qsBuilt = qsBuiltFromMeta.length
      ? qsBuiltFromMeta
      : deriveBasicNcmQuestions({ hsHeading: builtMeta?.hsHeading as string | undefined, kind: builtMeta?.kind as string | undefined, candidates: builtCandidates });

    if (!url && builtCandidates.length >= 2 && qsBuilt.length) {
      const { hidden } = buildHiddenChoiceSet(builtCandidates, built?.ncm as string | undefined, 5);
      built.raw = { ...((built.raw as Record<string, unknown>) ?? {}), ncmChoiceOptions: hidden, ncmDisambiguationAsked: true };
      await prisma.quote.create({
        data: { anonId, mode: "quote", userText, sourceUrl: url ?? undefined, productJson: built as never, quoteJson: { awaiting: "ncm_disambiguation" } as never, stage: "awaiting_product", userId: userId ?? undefined },
      }).catch(() => null);
      return ask(
        ["Para **clasificar el NCM** con precisión, necesito afinar 1–3 datos técnicos.", "", ["Respondeme esto (podés contestar en una sola línea):", ...qsBuilt.map((q) => `- ${q}`), ""].join("\n"), "Después seguimos con el precio y la cantidad."].filter(Boolean).join("\n")
      );
    }

    if (typeof built.fobUsd !== "number") {
      await prisma.quote.create({
        data: { anonId, mode: "quote", userText, sourceUrl: url ?? undefined, productJson: built as never, quoteJson: { awaiting: "unit_price" } as never, stage: "awaiting_price", userId: userId ?? undefined },
      }).catch(() => null);
      return ask(
        "Para estimar el **total puesto en Argentina** necesito el **precio unitario** en **USD**.\n\n¿Cuál es el precio por unidad? (ej: `USD 120`)",
        built
      );
    }

    if (typeof built.quantity !== "number") {
      await prisma.quote.create({
        data: { anonId, mode: "quote", userText, sourceUrl: url ?? undefined, productJson: built as never, quoteJson: { awaiting: "quantity" } as never, stage: "awaiting_quantity", userId: userId ?? undefined },
      }).catch(() => null);
      return ask("Perfecto. ¿Cuál es la **cantidad** a importar? (ej: `500 unidades`)", built);
    }

    return await quoteAndRespond(null, built);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return NextResponse.json(
      { assistantMessage: `No pude procesar tu solicitud. ${msg}` },
      { status: 500 }
    );
  }
}
