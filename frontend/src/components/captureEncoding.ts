import type { CaptureAttachment } from './CaptureChecklist';

export function encodeCapture(file: File, shot: string): Promise<CaptureAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const separator = dataUrl.indexOf(',');
      if (separator < 0) {
        reject(new Error(`Could not encode ${file.name}`));
        return;
      }
      resolve({
        shot,
        filename: file.name,
        content_base64: dataUrl.slice(separator + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}
