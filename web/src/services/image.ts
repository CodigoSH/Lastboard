/**
 * Shrinking a picture the user picked, before it goes into the database.
 *
 * This lived as a private method of SettingsContent, which meant the setup
 * wizard — the one place where somebody is choosing a picture for the first
 * time — sent the file untouched: a phone photo is several megabytes of base64
 * in a column that travels in every response carrying that user.
 */

/** What the server stores and measures. Mirrors the cap in user.go. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * The size a picture becomes when it has to fit inside a box, keeping its
 * shape. A picture already smaller than the box is left alone: blowing it up
 * would add bytes and no detail.
 */
export function fitWithin(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number } {
    if (width <= 0 || height <= 0) return { width: 0, height: 0 };

    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

/**
 * How big a data URL is as far as the server is concerned.
 *
 * The server caps `len(avatar_url)` — the whole string, prefix included — and
 * base64 is about a third longer than the bytes it encodes. Checking the file
 * against that cap passes a file that produces a value over it, which is a
 * rejection arriving just after the check written to prevent it.
 */
export function storedLength(dataUrl: string): number {
    return dataUrl.length;
}

/**
 * The formats worth trying, and whether they carry transparency.
 *
 * `toDataURL('image/jpeg', 0.8)` for everything put a logo with a transparent
 * background on a black square and moved flat brand colours — #e8520e came back
 * as rgb(232, 81, 14). So JPEG is only offered for a picture that has nothing
 * to lose, and it is the one format that needs a white sheet behind it.
 */
const FORMATS: ReadonlyArray<{ type: string; quality?: number; keepsAlpha: boolean }> = [
    { type: 'image/png', keepsAlpha: true },
    { type: 'image/webp', quality: 0.85, keepsAlpha: true },
    { type: 'image/jpeg', quality: 0.8, keepsAlpha: false },
];

/**
 * Whether any pixel is less than fully opaque.
 *
 * This decides whether JPEG is even a candidate, and it is worth the scan: an
 * avatar travels in every response that carries its user, and picking the first
 * format that happened to fit meant PNG every time — measured, 162 KB for a
 * photo that WebP writes in a fraction of that, for a picture with no
 * transparency to protect.
 */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    let pixels: Uint8ClampedArray;
    try {
        pixels = ctx.getImageData(0, 0, width, height).data;
    } catch {
        // A tainted canvas cannot be read. Assume there is something to lose.
        return true;
    }
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) return true;
    }
    return false;
}

/**
 * Of several encodings of the same picture, the one that costs least to store.
 *
 * Separate and pure because the first version took the first candidate under
 * the cap instead, and with a two-megabyte cap nothing after PNG was ever
 * reached: a photo went in at 162 KB that WebP writes in 25 KB.
 *
 * There is deliberately no preference for lossless here. It was tried, tuned on
 * a threshold, and dropped: the only thing it bought was a flat colour coming
 * back exact rather than one unit off in green — #e8520e as rgb(232, 81, 14) —
 * which nobody can see, while the sizes it was tuned against turned out to
 * depend on the test picture rather than on the format. What actually damaged a
 * logo was JPEG flattening its transparency to black, and that is settled
 * before anything gets here, by not offering JPEG for a picture that has any.
 */
export function smallestOf(dataUrls: readonly string[]): string {
    return dataUrls.reduce((a, b) => (storedLength(a) <= storedLength(b) ? a : b));
}

/**
 * Reads a picture, fits it inside maxWidth × maxHeight and returns the cheapest
 * encoding of it that keeps whatever the picture has to lose.
 *
 * Rejects if even that is over maxBytes: the server would refuse it anyway, and
 * a failure here can say why while a 400 arriving later cannot.
 */
export function resizeImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    maxBytes: number = AVATAR_MAX_BYTES,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                const { width, height } = fitWithin(img.width, img.height, maxWidth, maxHeight);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const transparent = hasTransparency(ctx, width, height);

                const candidates: string[] = [];
                for (const format of FORMATS) {
                    // JPEG cannot keep what this picture has.
                    if (transparent && !format.keepsAlpha) continue;

                    ctx.clearRect(0, 0, width, height);
                    if (!format.keepsAlpha) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    const url = canvas.toDataURL(format.type, format.quality);
                    // A canvas asked for a format it cannot write returns PNG
                    // without saying so, which would count the same picture
                    // twice and hide that WebP is unavailable here.
                    if (!url.startsWith(`data:${format.type}`)) continue;
                    candidates.push(url);
                }

                if (!candidates.length) {
                    reject(new Error('The canvas produced no usable image'));
                    return;
                }

                const chosen = smallestOf(candidates);
                if (storedLength(chosen) > maxBytes) {
                    reject(new Error(
                        `The picture is still ${storedLength(chosen)} bytes after resizing, ` +
                        `over the ${maxBytes} the server accepts`));
                    return;
                }
                resolve(chosen);
            };

            img.onerror = (e) => reject(e);
            img.src = event.target?.result as string;
        };

        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}
