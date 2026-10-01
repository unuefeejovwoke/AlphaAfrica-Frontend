import test from "node:test"
import assert from "node:assert/strict"
import {
  buildGalleryPhotos,
  clampGalleryIndex,
  describeGalleryPhoto,
  galleryOpenerLabel,
  nextPhotoIndex,
  prevPhotoIndex,
} from "../lib/listings.ts"

/**
 * Package gallery accessibility seam (ticket 19): the interactive decisions
 * — photo list shape, wrap-around navigation, announcement text — live in
 * pure functions. Nothing is rendered here.
 */

test("Gallery photos lead with the main image and drop its duplicates", () => {
  const photos = buildGalleryPhotos("Accra Escape", "Ghana", "main.jpg", [
    { id: 1, image: "main.jpg", caption: "dup" },
    { id: 2, image: "beach.jpg", caption: "Beach" },
    { id: 3, image: "food.jpg" },
  ])
  assert.deepEqual(
    photos.map((p) => p.image),
    ["main.jpg", "beach.jpg", "food.jpg"]
  )
  assert.equal(photos[0].caption, "Accra Escape — Ghana")
  assert.equal(photos[1].caption, "Beach")
  assert.equal(photos[2].caption, "Accra Escape — Ghana")
})

test("Gallery photos fall back to title plus destination without extras", () => {
  const photos = buildGalleryPhotos("Accra Escape", "Ghana", "main.jpg")
  assert.equal(photos.length, 1)
  assert.ok(photos[0].caption.length > 0, "Alt text must never be empty")
})

test("Photo navigation wraps around both ends", () => {
  assert.equal(nextPhotoIndex(0, 3), 1)
  assert.equal(nextPhotoIndex(2, 3), 0)
  assert.equal(prevPhotoIndex(0, 3), 2)
  assert.equal(prevPhotoIndex(1, 3), 0)
  assert.equal(nextPhotoIndex(0, 1), 0)
  assert.equal(prevPhotoIndex(0, 1), 0)
  assert.equal(nextPhotoIndex(0, 0), 0)
})

test("Open transition lands on a valid photo even if the list shrank", () => {
  assert.equal(clampGalleryIndex(0, 3), 0)
  assert.equal(clampGalleryIndex(2, 3), 2)
  assert.equal(clampGalleryIndex(5, 3), 2)
  assert.equal(clampGalleryIndex(-1, 3), 0)
  assert.equal(clampGalleryIndex(0, 0), 0)
})

test("Photo descriptions name the photo and its place", () => {
  assert.equal(
    describeGalleryPhoto("Accra Escape", "Beach", 1, 3),
    "Beach (photo 2 of 3)"
  )
  assert.equal(describeGalleryPhoto("Accra Escape", "", 0, 1), "Accra Escape")
})

test("Opener buttons carry an accessible name with position", () => {
  assert.equal(
    galleryOpenerLabel("Beach", 1, 3),
    "Open photo 2 of 3: Beach"
  )
  assert.equal(galleryOpenerLabel("Accra Escape — Ghana", 0, 1), "Open photo: Accra Escape — Ghana")
})
