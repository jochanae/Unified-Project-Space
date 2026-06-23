// Helper to load the IntoIQ logo as a base64 data URL for PDF embedding
let cachedLogo: string | null = null;

export async function getLogoBase64(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;

  try {
    const { default: logoUrl } = await import('@/assets/intoiq-logo.png');
    const response = await fetch(logoUrl);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogo = reader.result as string;
        resolve(cachedLogo);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
