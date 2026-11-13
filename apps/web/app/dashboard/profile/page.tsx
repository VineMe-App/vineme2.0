"use client";

import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/lib/dashboard/admin-context";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

const BIO_MAX_LENGTH = 500;

type ProfileRow = { bio: string | null; created_at: string };

export default function ProfilePage() {
  const { supabase, userId, fullName, avatarUrl, churchName, serviceName } =
    useAdmin();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("users")
      .select("bio, created_at")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error || !data) {
          setLoadFailed(true);
          return;
        }
        setProfile(data as ProfileRow);
      });
    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  const startEditing = () => {
    setDraft(profile?.bio ?? "");
    setSaveFailed(false);
    setIsEditingBio(true);
  };

  const saveBio = async () => {
    setIsSaving(true);
    setSaveFailed(false);
    const bio = draft.trim();
    const { error } = await supabase
      .from("users")
      .update({ bio: bio || null })
      .eq("id", userId);
    setIsSaving(false);

    if (error) {
      setSaveFailed(true);
      return;
    }
    setProfile((current) => (current ? { ...current, bio: bio || null } : current));
    setIsEditingBio(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("en-GB")
    : null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Church", value: churchName ?? "-" },
    { label: "Service", value: serviceName ?? "-" },
    { label: "Member since", value: memberSince ?? (loadFailed ? "-" : "...") },
    {
      label: "Communication & security",
      value: (
        <Link
          href="/dashboard/settings"
          className="text-primary underline underline-offset-4 hover:text-foreground"
        >
          Settings
        </Link>
      ),
    },
  ];

  return (
    <DashboardPage>
      <div className="mx-auto max-w-xl">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Profile</h1>

        <div className="mt-8 flex flex-col items-center text-center">
          <PersonAvatar
            name={fullName}
            src={avatarUrl}
            className="size-28"
            fallbackClassName="bg-brand-beige font-heading text-4xl font-bold text-primary"
          />
          <h2 className="mt-5 font-heading text-2xl font-bold sm:text-3xl">
            {fullName}
          </h2>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-foreground">Bio</h3>
            {!isEditingBio ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit bio"
                onClick={startEditing}
                disabled={!profile}
              >
                <PencilIcon />
              </Button>
            ) : null}
          </div>

          {isEditingBio ? (
            <div className="mt-2 space-y-3">
              <Textarea
                aria-label="Bio"
                value={draft}
                maxLength={BIO_MAX_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tell people a little about yourself"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">
                  {draft.length}/{BIO_MAX_LENGTH}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingBio(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveBio} loading={isSaving}>
                    Save
                  </Button>
                </div>
              </div>
              {saveFailed ? (
                <p className="text-destructive-foreground text-sm">
                  We could not save your bio. Try again.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">
              {loadFailed
                ? "We could not load your bio."
                : profile
                  ? profile.bio || "You have not added a bio yet."
                  : "Loading..."}
            </p>
          )}
        </div>

        <dl className="mt-8 divide-y border-y">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap items-center justify-between gap-2 py-4"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>

        <Button
          variant="secondary"
          size="xl"
          className="mt-8 w-full"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    </DashboardPage>
  );
}
