"use client";

import {
  createCustomer,
  deleteCustomer,
  type CustomerListItem,
  type ListCustomersResponse,
  type UpsertCustomerPayload,
  updateCustomer,
} from "@/api-clients";
import { CustomerForm } from "@/components/global/customer-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export function PropertyCustomersPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerListItem | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const query = useApiQuery<ListCustomersResponse>(
    ["customers", propertyId, page, searchQuery],
    `/api/properties/${propertyId}/customers?page=${page}&limit=10${
      searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
    }`,
    undefined,
    { enabled: Boolean(propertyId) },
  );
  const customers = useMemo(
    () => query.data?.customers ?? [],
    [query.data?.customers],
  );
  const createMutation = useMutation({
    mutationFn: (payload: UpsertCustomerPayload) => createCustomer(propertyId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers", propertyId] });
      setCreateOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (payload: UpsertCustomerPayload) => {
      if (!editing) throw new Error("No customer selected.");
      return updateCustomer(propertyId, editing._id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers", propertyId] });
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => deleteCustomer(propertyId, customerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers", propertyId] });
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            A customer represents a unique guest email for this property. Bookings link to customer records.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} disabled={!propertyId}>
          <PlusIcon data-icon="inline-start" />
          New customer
        </Button>
      </div>
      <form
        className="flex w-full max-w-md items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearchQuery(searchInput.trim());
        }}
      >
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name, email, or phone"
        />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        {query.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading customers...</p>
        ) : query.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{query.error.message}</p>
        ) : customers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No customers yet. Create a booking with guest email to generate customers.</p>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Last booking</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id} className="border-b border-border/40 text-sm">
                      <td className="px-4 py-3 font-medium">{customer.name?.trim() || "Unnamed customer"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.phone?.trim() || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.lastBookingAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(customer)}>
                            <PencilIcon data-icon="inline-start" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(customer._id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border/60 md:hidden">
              {customers.map((customer) => (
                <li key={customer._id} className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground">{customer.name?.trim() || "Unnamed customer"}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Phone: {customer.phone?.trim() || "—"} · Last booking: {formatDate(customer.lastBookingAt)}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditing(customer)}>
                      <PencilIcon data-icon="inline-start" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(customer._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {createMutation.isError ? <p className="text-sm text-destructive">{createMutation.error.message}</p> : null}
      {updateMutation.isError ? <p className="text-sm text-destructive">{updateMutation.error.message}</p> : null}
      {deleteMutation.isError ? <p className="text-sm text-destructive">{deleteMutation.error.message}</p> : null}
      {query.data?.pagination ? (
        <div className="flex justify-end">
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={!query.data.pagination.hasPreviousPage}
                  onClick={() => {
                    if (!query.data?.pagination.hasPreviousPage) return;
                    setPage((prev) => Math.max(1, prev - 1));
                  }}
                />
              </PaginationItem>
              {Array.from({ length: query.data.pagination.totalPages }, (_, idx) => idx + 1)
                .filter((p) =>
                  p === 1 ||
                  p === query.data!.pagination.totalPages ||
                  Math.abs(p - query.data!.pagination.page) <= 1,
                )
                .map((p) => (
                  <PaginationItem key={`page-${p}`}>
                    <PaginationLink
                      isActive={p === query.data?.pagination.page}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  disabled={!query.data.pagination.hasNextPage}
                  onClick={() => {
                    if (!query.data?.pagination.hasNextPage) return;
                    setPage((prev) => prev + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Create customer</DialogTitle>
          <CustomerForm
            submitLabel="Create customer"
            pendingLabel="Creating..."
            isPending={createMutation.isPending}
            errorMessage={createMutation.error?.message}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(payload) => createMutation.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Edit customer</DialogTitle>
          {editing ? (
            <CustomerForm
              key={`${editing._id}-${editing.updatedAt}`}
              initialValue={{
                email: editing.email,
                name: editing.name,
                phone: editing.phone,
              }}
              submitLabel="Save changes"
              pendingLabel="Saving..."
              isPending={updateMutation.isPending}
              errorMessage={updateMutation.error?.message}
              onCancel={() => setEditing(null)}
              onSubmit={(payload) => updateMutation.mutate(payload)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
