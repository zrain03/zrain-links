// Shared QR preview for Direct Links and Visits Links.
// The user must explicitly choose Download QR before a file is saved.
const dialog = document.getElementById("qr-dialog");
const image = document.getElementById("qr-dialog-image");
const loading = document.getElementById("qr-dialog-loading");
const error = document.getElementById("qr-dialog-error");
const link = document.getElementById("qr-dialog-url");
const download = document.getElementById("qr-dialog-download");
const closeButton = document.getElementById("qr-dialog-close");
const dismiss = document.getElementById("qr-dialog-dismiss");

let objectUrl = null;
let filename = "";
let generation = 0;

function releaseImage() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  image.removeAttribute("src");
  image.hidden = true;
  download.disabled = true;
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

dialog.addEventListener("close", () => {
  generation += 1;
  releaseImage();
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});
closeButton.addEventListener("click", closeDialog);
dismiss.addEventListener("click", closeDialog);
download.addEventListener("click", () => {
  if (!objectUrl || download.disabled) return;
  // A download only occurs after this explicit click.
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
});

export async function openQrPreview({ fetchQr, shortUrl, fileName }) {
  const request = ++generation;
  releaseImage();
  filename = fileName;
  link.textContent = shortUrl;
  link.href = shortUrl;
  error.hidden = true;
  error.textContent = "";
  loading.hidden = false;
  if (!dialog.open) dialog.showModal();

  try {
    const response = await fetchQr();
    const blob = await response.blob();
    if (request !== generation || !dialog.open) return;
    if (!blob.type.includes("svg") || !blob.size || blob.size > 2_000_000)
      throw new Error("The QR preview could not be loaded.");
    objectUrl = URL.createObjectURL(blob);
    image.src = objectUrl;
    image.hidden = false;
    download.disabled = false;
  } catch (cause) {
    if (request !== generation || !dialog.open) return;
    releaseImage();
    error.textContent = cause?.message || "Could not load the QR code. Try again.";
    error.hidden = false;
  } finally {
    if (request === generation) loading.hidden = true;
  }
}
