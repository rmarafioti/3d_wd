// Single gallery view: the gallery's details and its slug (how the client website asks for it, so
// the site owner can say which gallery goes where), each image with its caption, alt text and
// crops, Edit Gallery, Delete Gallery, and the Published switch next to the status pill. Built
// like the post page: the switch saves straight away (no confirmation, no success dialog), Delete
// Gallery asks first (ConfirmDialog) and returns to /dashboard once the gallery is deleted, and
// the dashboard's ⋮ menu links here with ?edit=1 to open the Edit form straight away.
// A Client Component on purpose: per-user data is only ever fetched client-side.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGallery } from "../../../_hooks/useGallery";
import { useGalleries } from "../../../_hooks/useGalleries";
import { useWebsites } from "../../../_hooks/useWebsites";
import GalleryForm, {
  galleryToFormValues,
} from "../../../_components/GalleryForm";
import MessageDialog from "../../../_components/MessageDialog";
import ConfirmDialog from "../../../_components/ConfirmDialog";
import Toggle from "../../../_components/Toggle";
import StatusPill from "../../../_components/StatusPill";
import CropPreview from "../../../_components/CropPreview";

import styles from "../../../_styling/postPage.module.css";

// Edit Gallery: the form, given the site owner's websites so a name another gallery on this
// website has is refused before submit. They are fetched only while the form is open; until they
// arrive, the backend's 409 still catches a taken name.
function EditGalleryForm({ gallery, onSubmit, onClose }) {
  const websites = useWebsites();
  return (
    <GalleryForm
      mode="edit"
      websites={websites.data ?? []}
      websiteId={gallery.websiteId}
      galleryId={gallery.id}
      initialValues={galleryToFormValues(gallery)}
      onSubmit={onSubmit}
      // No success dialog: useGallery already holds the API's updated copy, so the page shows the
      // edit as the form closes.
      onSuccess={onClose}
      onClose={onClose}
    />
  );
}

// One of an image's crops, as a column beside the main image: its label, then its picture or
// "None".
function Crop({ label, image, crop }) {
  return (
    <div className={styles.imageColumn}>
      <p className={styles.key}>{label}</p>
      {crop ? (
        <CropPreview
          src={image.src}
          width={image.width}
          height={image.height}
          crop={crop}
          alt={`${label} crop of ${image.altText}`}
        />
      ) : (
        <p>None</p>
      )}
    </div>
  );
}

export default function GalleryPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: gallery, loading, error, update, setStatus } = useGallery(id);
  const { remove } = useGalleries();

  // ?edit=1 (the ⋮ menu's Edit) opens the form; it shows once the gallery has loaded.
  const openEditOnLoad = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(openEditOnLoad);
  const [statusPending, setStatusPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  // The open error dialog's text: a failed status change or delete. Closing it leaves the gallery
  // on screen as it was.
  const [message, setMessage] = useState(null);

  // Drops ?edit=1 from the address once read, so a refresh or Back doesn't reopen the form.
  useEffect(() => {
    if (openEditOnLoad) router.replace(`/dashboard/gallery/${id}`);
  }, [openEditOnLoad, router, id]);

  if (error?.status === 404) {
    return (
      <>
        <p>Gallery not found.</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </>
    );
  }
  if (error) return <p>{error.message}</p>;
  if (loading) return <p>Loading…</p>;

  // useGallery stores the API's Gallery on success, which moves the pill and the switch together.
  async function changeStatus(published) {
    setStatusPending(true);
    try {
      await setStatus(published ? "published" : "draft");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setStatusPending(false);
    }
  }

  // The confirm dialog closes first; Delete Gallery reads "Deleting…" while the request is in
  // flight. The dashboard fetches its list on mount, so the deleted gallery is no longer listed.
  async function deleteGallery() {
    setConfirmingDelete(false);
    setDeletePending(true);
    try {
      await remove(id);
      router.push("/dashboard");
    } catch (err) {
      setDeletePending(false);
      setMessage(err.message);
    }
  }

  return (
    <article>
      <section className={`${styles.postPage} ${styles.galleryPage}`}>
        <p>Website: {gallery.websiteName}</p>
        <h1>Gallery Name: {gallery.galleryName}</h1>
        <div className={styles.statusRow}>
          <StatusPill
            active={gallery.status === "published"}
            onLabel="published"
            offLabel="draft"
            className={styles.statusPill}
          />
          <Toggle
            label="Published"
            statusColors
            offLabel="draft"
            onLabel="published"
            checked={gallery.status === "published"}
            disabled={statusPending}
            onChange={changeStatus}
          />
        </div>

        <dl>
          <dt className={styles.key}>Gallery Code:</dt>
          <dd className={styles.value}>
            {gallery.slug}
            <br />
            <i className={styles.note}>
              *Give us this code when you tell us where this gallery goes on
              your website.
            </i>
          </dd>
          <dt className={styles.key}>Title:</dt>
          <dd className={styles.value}>{gallery.title ?? "None"}</dd>
          <dt className={styles.key}>Copy:</dt>
          {/* pre-line keeps the line breaks the site owner typed. */}
          <dd className={styles.value} style={{ whiteSpace: "pre-line" }}>
            {gallery.copy ?? "None"}
          </dd>
        </dl>

        <div className={styles.imagesSection}>
          <h2 className={`${styles.key} ${styles.imagesHeader}`}>Images:</h2>
          {/* Two images per row on desktop, so a long gallery doesn't need much scrolling. */}
          <div className={styles.imageGrid}>
            {gallery.images.map((image) => (
              // The main image and its two crops side by side, then its caption and alt text, so
              // an image doesn't take three pictures' height.
              <figure key={image.id} className={styles.galleryImage}>
                <div className={styles.imageRow}>
                  <div className={styles.imageColumn}>
                    <p className={styles.key}>Main</p>
                    {/* Unoptimized, at its stored size, as on the post page. */}
                    <Image
                      src={image.src}
                      width={image.width}
                      height={image.height}
                      alt={image.altText}
                      unoptimized
                      className={styles.mainImage}
                    />
                  </div>
                  <Crop
                    label="Thumbnail"
                    image={image}
                    crop={image.thumbnailCrop}
                  />
                  <Crop label="Mobile" image={image} crop={image.mobileCrop} />
                </div>
                <dl>
                  <dt className={styles.key}>Caption:</dt>
                  <dd className={styles.value}>{image.caption ?? "None"}</dd>
                  {/* The image's alt already gives screen readers this text. */}
                  <dt className={styles.key} aria-hidden="true">
                    Alt Text:
                  </dt>
                  <dd className={styles.value} aria-hidden="true">
                    {image.altText}
                  </dd>
                </dl>
              </figure>
            ))}
          </div>
        </div>

        <div className={styles.timeStampSection}>
          <p>
            <b>Created:</b> {new Date(gallery.createdAt).toLocaleString()}
          </p>
          <p>
            <b>Last updated:</b> {new Date(gallery.updatedAt).toLocaleString()}
          </p>
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => setEditing(true)}
          >
            Edit Gallery
          </button>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => setConfirmingDelete(true)}
          >
            {deletePending ? "Deleting…" : "Delete Gallery"}
          </button>
        </div>

        {editing && (
          <EditGalleryForm
            gallery={gallery}
            onSubmit={update}
            onClose={() => setEditing(false)}
          />
        )}
        {confirmingDelete && (
          <ConfirmDialog
            message={`Delete ${gallery.galleryName}? It will be removed from your dashboard and your website. This can't be undone.`}
            confirmLabel="Delete Gallery"
            onConfirm={deleteGallery}
            onClose={() => setConfirmingDelete(false)}
          />
        )}
        {message && (
          <MessageDialog message={message} onClose={() => setMessage(null)} />
        )}
      </section>
    </article>
  );
}
