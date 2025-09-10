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

// 加载待审核数据
async function loadReviewData() {
    const reviewList = document.getElementById('reviewList');
    if (!reviewList) return;

    if (!window.allianceSystem.pendingData || window.allianceSystem.pendingData.length === 0) {
        reviewList.innerHTML = '<div class="no-data">暂无待审核数据</div>';
        return;
    }

    let html = '';
    window.allianceSystem.pendingData.forEach((item, index) => {
        const typeText = {
            'new': '新增申请',
            'update': '修改申请', 
            'delete': '删除申请'
        }[item.type] || '数据申请';

        const relationText = {
            'green': '联盟',
            'orange': '敌对',
            'blue': '合作'
        }[item.relation] || '未知';

        html += `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-type">${typeText}</span>
                    <span class="review-time">${window.AllianceUtils.formatDate(item.timestamp)}</span>
                </div>
                <div class="review-content">
                    <div class="review-info">
                        <strong>山头:</strong> ${item.mountain || '未知'}<br>
                        <strong>妖盟:</strong> ${item.alliance || '未知'}<br>
                        ${item.relation ? `<strong>关系:</strong> ${relationText}<br>` : ''}
                        ${item.totalPower ? `<strong>总战力:</strong> ${window.AllianceUtils.formatNumber(item.totalPower)}万亿<br>` : ''}
                        ${item.members && item.members.length > 0 ? 
                            `<strong>车头:</strong> ${item.members.map(m => `${m.name}(${window.AllianceUtils.formatNumber(m.power)}万亿)`).join(', ')}` : ''}
                    </div>
                    <div class="review-actions">
                        <button onclick="window.AllianceAdmin.approveData(${index})" class="approve-btn">通过</button>
                        <button onclick="window.AllianceAdmin.rejectData(${index})" class="reject-btn">拒绝</button>
                    </div>
                </div>
            </div>
        `;
    });

    reviewList.innerHTML = html;
}

// 拒绝申请
async function rejectData(index) {
    if (!window.allianceSystem.isAdmin) {
        window.AllianceUtils.showToast('需要管理员权限', 'error');
        return;
    }
    
    const item = window.allianceSystem.pendingData[index];
    if (!item) {
        window.AllianceUtils.showToast('数据不存在', 'error');
        return;
    }
    
    if (!confirm(`确认拒绝这个${item.type === 'delete' ? '删除' : item.type === 'update' ? '修改' : '新增'}申请吗？`)) {
        return;
    }
    
    try {
        // 删除待审核数据
        await window.AllianceUtils.deletePendingData(item.firebaseKey);
        
        // 记录审核日志
        if (window.AdminManagement && window.AdminManagement.logAuditAction) {
            try {
                await window.AdminManagement.logAuditAction('REJECT_DATA', {
                    mountain: item.mountain,
                    alliance: item.alliance,
                    type: item.type || 'new'
                });
            } catch (error) {
                console.error('审核日志记录失败:', error);
            }
        }
        
        window.AllianceUtils.showToast('申请已拒绝');
        
    } catch (error) {
        console.error('拒绝操作失败:', error);
        window.AllianceUtils.showToast('操作失败，请稍后重试', 'error');
    }
}

// 批量通过所有申请
async function batchApproveAll() {
    if (!window.allianceSystem.isAdmin) {
        window.AllianceUtils.showToast('需要管理员权限', 'error');
        return;
    }
    
    if (window.allianceSystem.pendingData.length === 0) {
        window.AllianceUtils.showToast('暂无待审核数据', 'error');
        return;
    }
    
    if (!confirm(`确认要批量通过所有 ${window.allianceSystem.pendingData.length} 个申请吗？`)) {
        return;
    }
    
    let successCount = 0;
    const totalCount = window.allianceSystem.pendingData.length;
    
    for (let i = 0; i < totalCount; i++) {
        try {
            await approveData(0); // 始终处理第一个，因为处理后数组会变化
            successCount++;
        } catch (error) {
            console.error(`批量处理第${i+1}个申请失败:`, error);
        }
    }
    
    window.AllianceUtils.showToast(`批量处理完成！成功: ${successCount}, 总数: ${totalCount}`);
}

// 导出管理员功能 - 添加这部分代码到admin.js文件末尾
window.AllianceAdmin = {
    loadReviewData,
    approveData,
    rejectData,  
    batchApproveAll
};
