const store = require('../../utils/photo-store')
const app = getApp()
Page({
  data: { groups: [], selected: null, total: 0, reclaimText: '', empty: true },
  onShow() { this.refresh() },
  refresh() {
    const groups = store.duplicateGroups().map(store.enrichGroup)
    const stats = store.computeStats()
    this.setData({ groups, total: stats.duplicateGroups, reclaimText: stats.reclaimText, empty: !groups.length })
    if (app.globalData.selectedDigest && app.globalData.selectedBatchId) {
      const group = groups.filter(function (item) { return item.digest === app.globalData.selectedDigest && item.batchId === app.globalData.selectedBatchId })[0]
      if (group) this.openGroup({ currentTarget: { dataset: { index: groups.indexOf(group) } } })
      app.globalData.selectedDigest = ''
      app.globalData.selectedBatchId = ''
    }
  },
  openGroup(e) { this.setData({ selected: this.data.groups[e.currentTarget.dataset.index] }) },
  closeGroup() { this.setData({ selected: null }) },
  chooseKeep(e) {
    const selected = this.data.selected
    if (!selected) return
    store.confirmGroup(selected.batchId, selected.digest, e.currentTarget.dataset.id)
    this.setData({ selected: null }); this.refresh(); wx.showToast({ title: '已确认这一组', icon: 'success' })
  },
  noop() {},
  goHome() { wx.switchTab({ url: '/pages/index/index' }) }
})