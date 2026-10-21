const STORAGE_KEY = 'ai_photo_organizer_v1'
const DATA_VERSION_KEY = 'ai_photo_organizer_data_version'
const DATA_VERSION = 2
const REVIEW_META = {
  pending: { label: '待确认', color: '#d97706', bg: '#fff7e6' },
  keep: { label: '保留', color: '#168a52', bg: '#eaf8f0' },
  remove: { label: '建议清理', color: '#d14343', bg: '#fff0f0' }
}
let idSeed = 0
function genId() { idSeed += 1; return 'p' + Date.now().toString(36) + '_' + idSeed }
function ensureDataVersion() {
  if (wx.getStorageSync(DATA_VERSION_KEY) >= DATA_VERSION) return
  const rows = wx.getStorageSync(STORAGE_KEY)
  if (Array.isArray(rows)) {
    wx.setStorageSync(STORAGE_KEY, rows.map(function (photo) { return Object.assign({}, photo, { reviewStatus: 'pending' }) }))
  }
  wx.setStorageSync(DATA_VERSION_KEY, DATA_VERSION)
}
function loadPhotos() { ensureDataVersion(); const rows = wx.getStorageSync(STORAGE_KEY); return Array.isArray(rows) ? rows : [] }
function savePhotos(rows) { wx.setStorageSync(STORAGE_KEY, rows); return rows }
function addPhotoBatch(items) {
  const rows = loadPhotos(); const now = Date.now(); const batchId = 'batch_' + Date.now().toString(36)
  const created = items.map(function (item, index) { return {
    id: genId(), name: item.name || ('照片 ' + (rows.length + index + 1)), path: item.path,
    size: Number(item.size) || 0, width: Number(item.width) || 0, height: Number(item.height) || 0,
    digest: item.digest || '', type: item.type || 'image', importedAt: item.importedAt || now,
    importBatchId: item.importBatchId || batchId, importIndex: Number.isFinite(item.importIndex) ? item.importIndex : index,
    reviewStatus: 'pending', aiTags: [], aiSummary: '', source: '用户主动选择'
  } })
  savePhotos(created.concat(rows)); return created
}
function getPhoto(id) { return loadPhotos().filter(function (item) { return item.id === id })[0] || null }
function updatePhoto(id, patch) {
  const rows = loadPhotos(); const index = rows.findIndex(function (item) { return item.id === id })
  if (index < 0) return null; rows[index] = Object.assign({}, rows[index], patch || {}); savePhotos(rows); return rows[index]
}
function setReviewStatus(id, status) { return REVIEW_META[status] ? updatePhoto(id, { reviewStatus: status }) : null }
function removePhotoRecord(id) { const rows = loadPhotos(); const photo = getPhoto(id); savePhotos(rows.filter(function (item) { return item.id !== id })); return photo }
function getBatchId(photo) { return photo.importBatchId || ('legacy_' + (photo.importedAt || photo.id)) }
function qualityScore(photo) {
  const pixels = (photo.width || 0) * (photo.height || 0)
  return Math.min(70, Math.round(pixels / 120000)) + Math.min(25, Math.round((photo.size || 0) / 300000)) + (photo.width && photo.height ? 5 : 0)
}
function duplicateGroups(rows) {
  const map = {}
  ;(rows || loadPhotos()).forEach(function (photo) {
    if (!photo.digest) return
    const batchId = getBatchId(photo)
    const key = batchId + '::' + photo.digest
    if (!map[key]) map[key] = { batchId: batchId, digest: photo.digest, photos: [] }
    map[key].photos.push(photo)
  })
  return Object.keys(map).filter(function (key) { return map[key].photos.length > 1 }).map(function (key, index) {
    const entry = map[key]
    const photos = entry.photos.slice().sort(function (a, b) { return qualityScore(b) - qualityScore(a) })
    const markedKeep = photos.filter(function (photo) { return photo.reviewStatus === 'keep' })[0]
    const recommendedKeepId = markedKeep ? markedKeep.id : photos[0].id
    const reclaimBytes = photos.reduce(function (sum, photo) { return sum + (photo.id === recommendedKeepId ? 0 : photo.size || 0) }, 0)
    return { id: 'dup_' + index + '_' + entry.digest.slice(0, 8), digest: entry.digest, batchId: entry.batchId, count: photos.length, photos: photos, recommendedKeepId: recommendedKeepId, reclaimBytes: reclaimBytes, confirmed: photos.every(function (photo) { return photo.reviewStatus !== 'pending' }) }
  }).sort(function (a, b) { return b.reclaimBytes - a.reclaimBytes })
}
function confirmGroup(batchId, digest, keepId) { savePhotos(loadPhotos().map(function (photo) { return getBatchId(photo) !== batchId || photo.digest !== digest ? photo : Object.assign({}, photo, { reviewStatus: photo.id === keepId ? 'keep' : 'remove' }) })); return loadPhotos() }
function formatBatchTime(time) { const date = new Date(Number(time) || Date.now()); const month = date.getMonth() + 1; const day = date.getDate(); const hour = String(date.getHours()).padStart(2, '0'); const minute = String(date.getMinutes()).padStart(2, '0'); return month + '月' + day + '日 ' + hour + ':' + minute }
function formatBytes(bytes) { const value = Number(bytes) || 0; if (value < 1024) return value + ' B'; if (value < 1048576) return (value / 1024).toFixed(1) + ' KB'; if (value < 1073741824) return (value / 1048576).toFixed(1) + ' MB'; return (value / 1073741824).toFixed(2) + ' GB' }
function enrichPhoto(photo) { const meta = REVIEW_META[photo.reviewStatus] || REVIEW_META.pending; return Object.assign({}, photo, { sizeText: formatBytes(photo.size), resolutionText: photo.width && photo.height ? photo.width + ' × ' + photo.height : '尺寸未知', reviewMeta: meta, qualityScore: qualityScore(photo) }) }
function enrichGroup(group) { const importedAt = group.photos.reduce(function (value, photo) { return Math.max(value, Number(photo.importedAt) || 0) }, 0); return Object.assign({}, group, { photos: group.photos.map(enrichPhoto), batchText: formatBatchTime(importedAt), reclaimText: formatBytes(group.reclaimBytes), statusText: group.confirmed ? '已确认' : '待确认' }) }
function computeStats(rows) {
  const photos = rows || loadPhotos(); const groups = duplicateGroups(photos)
  const reclaimBytes = groups.reduce(function (sum, group) { return sum + group.reclaimBytes }, 0)
  return { total: photos.length, totalBytesText: formatBytes(photos.reduce(function (sum, photo) { return sum + (photo.size || 0) }, 0)), duplicateGroups: groups.length, duplicatePhotos: groups.reduce(function (sum, group) { return sum + group.count - 1 }, 0), reclaimText: formatBytes(reclaimBytes), pending: photos.filter(function (photo) { return photo.reviewStatus === 'pending' }).length, remove: photos.filter(function (photo) { return photo.reviewStatus === 'remove' }).length, keep: photos.filter(function (photo) { return photo.reviewStatus === 'keep' }).length }
}
module.exports = { STORAGE_KEY, REVIEW_META, getBatchId, loadPhotos, savePhotos, addPhotoBatch, getPhoto, updatePhoto, setReviewStatus, removePhotoRecord, duplicateGroups, confirmGroup, computeStats, enrichPhoto, enrichGroup, formatBatchTime, formatBytes }