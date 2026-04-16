"use client";

import {
  createRoomTag,
  deleteRoomTag,
  type ListRoomTagsResponse,
  type RoomTagItem,
  updateRoomTag,
} from "@/api-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PropertyRoomTagsPage() {
  const params = useParams();
  const propertyId = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  const tagsQuery = useApiQuery<ListRoomTagsResponse>(
    ["room-tags", propertyId],
    `/api/properties/${propertyId}/room-tags`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const createMutation = useMutation({
    mutationFn: () => createRoomTag(propertyId, { name: newTagName.trim() }),
    onSuccess: async () => {
      setNewTagName("");
      await queryClient.invalidateQueries({ queryKey: ["room-tags", propertyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (tag: RoomTagItem) => updateRoomTag(propertyId, tag._id, { name: editingTagName.trim() }),
    onSuccess: async () => {
      setEditingTagId(null);
      setEditingTagName("");
      await queryClient.invalidateQueries({ queryKey: ["room-tags", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tag: RoomTagItem) => deleteRoomTag(propertyId, tag._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["room-tags", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Room tags</h1>
        <p className="text-sm text-muted-foreground">Manage reusable tags that can be linked to room listings.</p>
      </div>

      <section className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name (e.g. Sea view)"
          />
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!newTagName.trim() || createMutation.isPending}
          >
            <PlusIcon className="size-4" />
            Add tag
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        {tagsQuery.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading tags...</p>
        ) : tagsQuery.isError ? (
          <p className="px-5 py-8 text-sm text-destructive">{tagsQuery.error.message}</p>
        ) : (tagsQuery.data?.tags.length ?? 0) === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No room tags yet.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {tagsQuery.data?.tags.map((tag) => (
              <li key={tag._id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                {editingTagId === tag._id ? (
                  <Input value={editingTagName} onChange={(e) => setEditingTagName(e.target.value)} />
                ) : (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{tag.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{tag.slug}</p>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {editingTagId === tag._id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateMutation.mutate(tag)}
                        disabled={!editingTagName.trim() || updateMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTagId(null);
                          setEditingTagName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingTagId(tag._id);
                          setEditingTagName(tag.name);
                        }}
                        aria-label="Edit tag"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(tag)}
                        aria-label="Delete tag"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
