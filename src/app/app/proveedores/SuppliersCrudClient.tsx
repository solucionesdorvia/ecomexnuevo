"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export type SupplierRow = {
  id: string;
  name: string;
  country: string;
  contact: string | null;
  createdAt: string;
  operationsCount: number;
};

type ActionError = { key: string; message: string } | null;

export function SuppliersCrudClient({ initialSuppliers }: { initialSuppliers: SupplierRow[] }) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>(initialSuppliers);
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newContact, setNewContact] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<ActionError>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editContact, setEditContact] = useState("");
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [patchErr, setPatchErr] = useState<ActionError>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<ActionError>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function submitCreate() {
    setCreateErr(null);
    setCreating(true);
    try {
      const res = await fetch("/api/app/suppliers", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName,
          country: newCountry,
          contact: newContact.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { supplier?: SupplierRow; error?: string };
      if (!res.ok) throw new Error(json.error || "Error al crear.");
      if (json.supplier) {
        setSuppliers((prev) => [...prev, json.supplier!].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
        setNewCountry("");
        setNewContact("");
        refresh();
      }
    } catch (e) {
      setCreateErr({ key: "create", message: e instanceof Error ? e.message : "Error" });
    } finally {
      setCreating(false);
    }
  }

  function startEdit(s: SupplierRow) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCountry(s.country);
    setEditContact(s.contact ?? "");
    setPatchErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setPatchErr(null);
  }

  async function submitPatch(id: string) {
    setPatchErr(null);
    setPatchingId(id);
    try {
      const res = await fetch(`/api/app/suppliers/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: editName,
          country: editCountry,
          contact: editContact,
        }),
      });
      const json = (await res.json()) as { supplier?: SupplierRow; error?: string };
      if (!res.ok) throw new Error(json.error || "Error al guardar.");
      if (json.supplier) {
        setSuppliers((prev) =>
          prev.map((x) => (x.id === id ? json.supplier! : x)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        refresh();
      }
    } catch (e) {
      setPatchErr({ key: id, message: e instanceof Error ? e.message : "Error" });
    } finally {
      setPatchingId(null);
    }
  }

  async function submitDelete(id: string) {
    setDeleteErr(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/app/suppliers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || "Error al eliminar.");
      setSuppliers((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirmId(null);
      refresh();
    } catch (e) {
      setDeleteErr({ key: id, message: e instanceof Error ? e.message : "Error" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4 sm:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#555c6b]">Nuevo proveedor</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="text-[10px] uppercase text-[#555c6b]">Nombre</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/40"
              placeholder="Ej. Shenzhen Yifang Tech"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-[10px] uppercase text-[#555c6b]">País</span>
            <input
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/40"
              placeholder="China"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-[10px] uppercase text-[#555c6b]">Contacto (opcional)</span>
            <input
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b] focus:border-[#2b59ff]/40"
              placeholder="Email o WhatsApp"
            />
          </label>
        </div>
        {createErr?.key === "create" ? (
          <p className="mt-2 text-[12px] text-rose-400">{createErr.message}</p>
        ) : null}
        <button
          type="button"
          disabled={creating || !newName.trim() || !newCountry.trim()}
          onClick={() => void submitCreate()}
          className="mt-4 rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4] disabled:opacity-40"
        >
          {creating ? "Guardando…" : "Agregar proveedor"}
        </button>
      </section>

      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#555c6b]">Directorio</h2>
        {suppliers.length === 0 ? (
          <p className="mt-4 text-[14px] text-[#555c6b]">Todavía no cargaste proveedores.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {suppliers.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                {editingId === s.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-[10px] uppercase text-[#555c6b]">Nombre</span>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase text-[#555c6b]">País</span>
                        <input
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase text-[#555c6b]">Contacto</span>
                        <input
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#07111A] px-3 py-2 text-[13px] text-white"
                        />
                      </label>
                    </div>
                    {patchErr?.key === s.id ? (
                      <p className="text-[12px] text-rose-400">{patchErr.message}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={patchingId === s.id || !editName.trim() || !editCountry.trim()}
                        onClick={() => void submitPatch(s.id)}
                        className="rounded-lg bg-[#2b59ff] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-40"
                      >
                        {patchingId === s.id ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-white/[0.1] px-3 py-2 text-[12px] text-[#b0b8c9] hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[15px] font-semibold text-white">{s.name}</p>
                        <p className="mt-1 text-[13px] text-[#b0b8c9]">{s.country}</p>
                        {s.contact ? (
                          <p className="mt-1 text-[12px] text-[#555c6b]">{s.contact}</p>
                        ) : (
                          <p className="mt-1 text-[12px] text-[#555c6b]">Sin contacto</p>
                        )}
                        <p className="mt-2 text-[11px] text-[#555c6b]">
                          {s.operationsCount} operación{s.operationsCount !== 1 ? "es" : ""} vinculada
                          {s.operationsCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="rounded-lg border border-white/[0.1] px-3 py-2 text-[12px] text-[#b0b8c9] hover:text-white"
                        >
                          Editar
                        </button>
                        {deleteConfirmId === s.id ? (
                          <>
                            <span className="self-center text-[11px] text-rose-300">¿Eliminar proveedor?</span>
                            <button
                              type="button"
                              disabled={deletingId === s.id}
                              onClick={() => void submitDelete(s.id)}
                              className="rounded-lg bg-rose-600/90 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-40"
                            >
                              {deletingId === s.id ? "…" : "Sí, eliminar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmId(null);
                                setDeleteErr(null);
                              }}
                              className="rounded-lg border border-white/[0.1] px-3 py-2 text-[12px] text-[#b0b8c9]"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmId(s.id);
                              setDeleteErr(null);
                            }}
                            className="rounded-lg border border-rose-500/30 px-3 py-2 text-[12px] text-rose-300 hover:bg-rose-500/10"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                    {deleteErr?.key === s.id ? (
                      <p className="mt-2 text-[12px] text-rose-400">{deleteErr.message}</p>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
