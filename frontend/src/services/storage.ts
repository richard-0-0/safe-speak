// ── SafeSpeak — Firebase Storage Upload Helpers ─────────────────────
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload an image to Firebase Storage in the pending/ prefix.
 * Images start in pending/ until the CNN safety check clears them.
 */
export async function uploadImage(
    userId: string,
    messageId: string,
    file: File
): Promise<string> {
    const storageRef = ref(storage, `images/pending/${userId}/${messageId}`);
    const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
    });
    return getDownloadURL(snapshot.ref);
}

/**
 * Get a download URL for a file in Firebase Storage.
 */
export async function getFileUrl(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
}
