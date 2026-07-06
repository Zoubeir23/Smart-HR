/**
 * Taille de page utilisée par les pages de gestion qui appliquent
 * recherche/tri/pagination côté client (DataPagination.tsx).
 *
 * Le backend plafonne PAGE_SIZE=20 par défaut mais accepte `page_size`
 * jusqu'à 200 (LargeResultsSetPagination) : sans ce paramètre, les
 * enregistrements au-delà du 20e étaient invisibles pour la recherche
 * et le tri côté client.
 */
export const LIST_ALL_PAGE_SIZE = 200;
