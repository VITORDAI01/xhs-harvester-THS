export function resolveXhsPublishedAt({ detailPublishedAt, statePublishedAt }) {
  return detailPublishedAt || statePublishedAt || null;
}
