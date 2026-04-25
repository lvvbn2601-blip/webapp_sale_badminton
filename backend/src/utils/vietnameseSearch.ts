/**
 * Vietnamese-aware search utilities.
 *
 * Normalizes text by stripping Vietnamese diacritics (accents) and removing
 * spaces so that searches like "votcaulong" or "vot cau long" will match
 * "Vợt Cầu Lông".
 */

/**
 * Map of Vietnamese diacritical characters → their ASCII equivalents.
 * Covers all tone marks for a, ă, â, e, ê, i, o, ô, ơ, u, ư, y, đ.
 */
const DIACRITICS_MAP: Record<string, string> = {
  // a
  à: "a", á: "a", ạ: "a", ả: "a", ã: "a",
  ă: "a", ắ: "a", ằ: "a", ặ: "a", ẳ: "a", ẵ: "a",
  â: "a", ấ: "a", ầ: "a", ậ: "a", ẩ: "a", ẫ: "a",
  // e
  è: "e", é: "e", ẹ: "e", ẻ: "e", ẽ: "e",
  ê: "e", ế: "e", ề: "e", ệ: "e", ể: "e", ễ: "e",
  // i
  ì: "i", í: "i", ị: "i", ỉ: "i", ĩ: "i",
  // o
  ò: "o", ó: "o", ọ: "o", ỏ: "o", õ: "o",
  ô: "o", ố: "o", ồ: "o", ộ: "o", ổ: "o", ỗ: "o",
  ơ: "o", ớ: "o", ờ: "o", ợ: "o", ở: "o", ỡ: "o",
  // u
  ù: "u", ú: "u", ụ: "u", ủ: "u", ũ: "u",
  ư: "u", ứ: "u", ừ: "u", ự: "u", ử: "u", ữ: "u",
  // y
  ỳ: "y", ý: "y", ỵ: "y", ỷ: "y", ỹ: "y",
  // d
  đ: "d",
  // Uppercase
  À: "a", Á: "a", Ạ: "a", Ả: "a", Ã: "a",
  Ă: "a", Ắ: "a", Ằ: "a", Ặ: "a", Ẳ: "a", Ẵ: "a",
  Â: "a", Ấ: "a", Ầ: "a", Ậ: "a", Ẩ: "a", Ẫ: "a",
  È: "e", É: "e", Ẹ: "e", Ẻ: "e", Ẽ: "e",
  Ê: "e", Ế: "e", Ề: "e", Ệ: "e", Ể: "e", Ễ: "e",
  Ì: "i", Í: "i", Ị: "i", Ỉ: "i", Ĩ: "i",
  Ò: "o", Ó: "o", Ọ: "o", Ỏ: "o", Õ: "o",
  Ô: "o", Ố: "o", Ồ: "o", Ộ: "o", Ổ: "o", Ỗ: "o",
  Ơ: "o", Ớ: "o", Ờ: "o", Ợ: "o", Ở: "o", Ỡ: "o",
  Ù: "u", Ú: "u", Ụ: "u", Ủ: "u", Ũ: "u",
  Ư: "u", Ứ: "u", Ừ: "u", Ự: "u", Ử: "u", Ữ: "u",
  Ỳ: "y", Ý: "y", Ỵ: "y", Ỷ: "y", Ỹ: "y",
  Đ: "d",
};

/**
 * Remove Vietnamese diacritical marks from a string.
 * "Vợt Cầu Lông" → "Vot Cau Long"
 */
export function removeDiacritics(str: string): string {
  return str.replace(/./g, (ch) => DIACRITICS_MAP[ch] || ch);
}

/**
 * Generate a normalized search key from a product name.
 * Strips diacritics, lowercases, and removes ALL whitespace.
 *
 * "Vợt Cầu Lông Yonex Astrox 99 Pro" → "votcaulongyonexastrox99pro"
 */
export function toSearchKey(name: string): string {
  return removeDiacritics(name).toLowerCase().replace(/\s+/g, "");
}

/**
 * Build a MongoDB regex filter that matches a search query against the
 * `searchName` field.  The query itself is normalised so the user can type
 * with or without diacritics and with or without spaces.
 *
 * Example: query "vot cau" → regex /votcau/i matched against searchName
 */
export function buildSearchFilter(query: string): Record<string, unknown> {
  // Normalise the user query the same way we normalise the stored field
  const normalised = toSearchKey(query);
  if (!normalised) return {};

  // Escape regex-special characters in user input to prevent injection
  const escaped = normalised.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return {
    searchName: { $regex: escaped, $options: "i" },
  };
}
