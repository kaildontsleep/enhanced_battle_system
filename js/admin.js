// 通过审核 - 支持名称更改
async function approveData(index) {
    if (!window.allianceSystem.isAdmin) {
        window.AllianceUtils.showToast('需要管理员权限', 'error');
        return;
    }
    
    const item = window.allianceSystem.pendingData[index];
    if (!item) {
        window.AllianceUtils.showToast('数据不存在', 'error');
        return;
    }
    
    try {
        if (item.type === 'delete') {
            // 处理删除申请
            const success = await window.AllianceUtils.deleteAllianceData(item.mountain, item.alliance);
            if (!success) {
                window.AllianceUtils.showToast('删除操作失败', 'error');
                return;
            }
        } else {
            // 处理新增或更新
            const allianceData = {
                mountain: item.mountain,
                alliance: item.alliance,
                relation: item.relation,
                totalPower: item.totalPower || 0,
                members: item.members || [],
                lastUpdated: new Date().toISOString(),
                approvedBy: window.allianceSystem.currentUser?.username || 'admin',
                approvedAt: new Date().toISOString(),
                originalTimestamp: item.timestamp
            };
            
            // 如果是更新且有名称变更，需要先删除原数据
            if (item.type === 'update' && item.hasNameChange && item.originalMountain && item.originalAlliance) {
                await window.AllianceUtils.deleteAllianceData(item.originalMountain, item.originalAlliance);
            }
            
            const success = await window.AllianceUtils.saveAllianceData(allianceData);
            if (!success) {
                window.AllianceUtils.showToast('保存操作失败', 'error');
                return;
            }
        }
        
        // 删除待审核数据
        await window.AllianceUtils.deletePendingData(item.firebaseKey);
        
        // 记录审核日志
        if (window.AdminManagement && window.AdminManagement.logAuditAction) {
            try {
                await window.AdminManagement.logAuditAction('APPROVE_DATA', {
                    mountain: item.mountain,
                    alliance: item.alliance,
                    type: item.type || 'new',
                    hasNameChange: item.hasNameChange || false
                });
            } catch (error) {
                console.error('审核日志记录失败:', error);
            }
        }
        
        window.AllianceUtils.showToast('数据已通过审核！');
        
    } catch (error) {
        console.error('审核操作失败:', error);
        window.AllianceUtils.showToast('操作失败，请稍后重试', 'error');
    }
}
