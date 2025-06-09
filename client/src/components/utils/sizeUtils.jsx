export const calculateTotalSize = (filesize) => {
  if (isNaN(filesize)) return "Invalid input";

  const totalBytes = Number(filesize);
  const totalMB = totalBytes / (1024 * 1024);

  if (totalMB >= 1024) {
    return `${(totalMB / 1024).toFixed(2)} GB`;
  }
  return `${totalMB.toFixed(2)} MB`;
};
