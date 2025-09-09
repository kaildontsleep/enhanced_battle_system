// 管理员功能 - 修复版本

// 加载审核数据
function loadReviewData() {
    const container = document.getElementById('reviewList');
    if (!container) return;
    
    const pendingData = window.allianceSystem.pendingData || [];
    
    if (pendingData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>暂无待审核数据</h3>
                <p>所有提交的数据都已处理完毕</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    pendingData.forEach((item, index) => {
        const isUpdate = item.type === 'update';
        const isDelete = item.type === 'delete';
        const typeText = isDelete ? '删除申请' : isUpdate ? '数据更新' : '新增数据';
        const typeClass = isDelete ? 'delete' : isUpdate ? 'update' : 'new';
        
        html += `
            <div class="review-item ${typeClass}">
                <div class="review-header">
                    <span class="review-type ${typeClass}">${typeText}</span>
                    <span style="color: #666; font-size: 12px;">
                        ${window.AllianceUtils.formatDate(item.timestamp)}
                    </span>
                </div>
        `;
        
        if (isDelete) {
            html += `
                <div class="review-content">
                    <div class="review-field">
                        <label>山头</label>
                        <div class="value">${item.mountain}</div>
                    </div>
                    <div class="review-field">
                        <label>妖盟</label>
                        <div class="value">${item.alliance}</div>
                    </div>
                </div>
            `;
        } else {
            const relationText = item.relation === 'green' ? '联盟' : item.relation === 'orange' ? '敌对' : '中立';
            
            html += `
                <div class="review-content">
                    <div class="review-field">
                        <label>山头</label>
                        <div class="value">${item.mountain}</div>
                    </div>
                    <div class="review-field">
                        <label>妖盟名称</label>
                        <div class="value">${item.alliance}</div>
                    </div>
                    <div class="review-field">
                        <label>妖盟关系</label>
                        <div class="value">${relationText}</div>
                    </div>
                    <div class="review-field">
                        <label>总战力</label>
                        <div class="value">${window.AllianceUtils.formatNumber(item.totalPower)}万亿</div>
                    </div>
                </div>
            `;
            
            // 显示车头信息（如果有）
            if (item.members && item.members.length > 0) {
                html += `<div style="margin: 10px 0; font-weight: 600; color: #666;">车头信息：</div>`;
                html += `<div class="review-content">`;
                
                item.members.forEach((member, memberIndex) => {
                    html += `
                        <div class="review-field">
                            <label>车头${memberIndex + 1}</label>
                            <div class="value">${member.name}: ${window.AllianceUtils.formatNumber(member.power)}万亿</div>
                        </div>
                    `;
                });
                
                html += `</div>`;
            }
        }
        
        html += `
                <div class="review-actions">
                    <button class="reject-btn" onclick="rejectData(${index})">拒绝</button>
                    <button class="approve-btn" onclick="approveData(${index})">通过</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 通过审核 - 确保设置正确的时间戳并记录日志
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
                lastUpdated: new Date().toISOString(), // 审核通过时的时间戳
                approvedBy: window.allianceSystem.currentUser?.username || 'admin',
                approvedAt: new Date().toISOString(), // 审核时间
                originalTimestamp: item.timestamp // 保留原始提交时间
            };
            
            const success = await window.AllianceUtils.saveAllianceData(allianceData);
            if (!success) {
                window.AllianceUtils.showToast('保存操作失败', 'error');
                return;
            }
        }
        
        // 删除待审核数据
        await window.AllianceUtils.deletePendingData(item.firebaseKey);
        
        // 记录审核日志
        console.log('检查审核日志功能:', {
            AdminManagement: !!window.AdminManagement,
            logAuditAction: !!(window.AdminManagement && window.AdminManagement.logAuditAction),
            currentUser: window.allianceSystem.currentUser
        });

        if (window.AdminManagement && window.AdminManagement.logAuditAction) {
            console.log('开始记录审核日志...');
            try {
                await window.AdminManagement.logAuditAction('APPROVE_DATA', {
                    mountain: item.mountain,
                    alliance: item.alliance,
                    type: item.type || 'new'
                });
                console.log('审核日志记录成功');
            } catch (error) {
                console.error('审核日志记录失败:', error);
            }
        } else {
            console.log('审核日志功能不可用');
        }
        
        window.AllianceUtils.showToast('数据已通过审核！');
        
    } catch (error) {
        console.error('审核操作失败:', error);
        window.AllianceUtils.showToast('操作失败，请稍后重试', 'error');
    }
}

// 拒绝审核
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
    
    if (!confirm('确认拒绝此申请吗？')) {
        return;
    }
    
    try {
        await window.AllianceUtils.deletePendingData(item.firebaseKey);
        
        // 记录审核日志
        if (window.AdminManagement && window.AdminManagement.logAuditAction) {
            await window.AdminManagement.logAuditAction('REJECT_DATA', {
                mountain: item.mountain,
                alliance: item.alliance,
                type: item.type || 'new'
            });
        }
        
        window.AllianceUtils.showToast('申请已拒绝！');
    } catch (error) {
        console.error('拒绝操作失败:', error);
        window.AllianceUtils.showToast('操作失败，请稍后重试', 'error');
    }
}

// 批量操作 - 确保设置正确的时间戳
async function batchApproveAll() {
    if (!window.allianceSystem.isAdmin) {
        window.AllianceUtils.showToast('需要管理员权限', 'error');
        return;
    }
    
    const pendingCount = window.allianceSystem.pendingData.length;
    if (pendingCount === 0) {
        window.AllianceUtils.showToast('没有待审核的数据', 'error');
        return;
    }
    
    if (!confirm(`确认通过所有 ${pendingCount} 条待审核数据吗？`)) {
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // 创建数据副本，避免在处理过程中数组发生变化
    const dataToProcess = [...window.allianceSystem.pendingData];
    
    for (let i = 0; i < dataToProcess.length; i++) {
        try {
            const item = dataToProcess[i];
            
            if (item.type === 'delete') {
                await window.AllianceUtils.deleteAllianceData(item.mountain, item.alliance);
            } else {
                const allianceData = {
                    mountain: item.mountain,
                    alliance: item.alliance,
                    relation: item.relation,
                    totalPower: item.totalPower || 0,
                    members: item.members || [],
                    lastUpdated: new Date().toISOString(), // 批量审核通过时的时间戳
                    approvedBy: window.allianceSystem.currentUser?.username || 'admin',
                    approvedAt: new Date().toISOString(), // 审核时间
                    originalTimestamp: item.timestamp // 保留原始提交时间
                };
                await window.AllianceUtils.saveAllianceData(allianceData);
            }
            
            await window.AllianceUtils.deletePendingData(item.firebaseKey);
            successCount++;
        } catch (error) {
            failCount++;
            console.error(`批量审核失败 (${i + 1}):`, error);
        }
        
        // 添加延迟避免过快操作
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    window.AllianceUtils.showToast(`批量操作完成！成功：${successCount}，失败：${failCount}`);
}

// 导出管理员功能
window.AllianceAdmin = {
    loadReviewData,
    approveData,
    rejectData,
    batchApproveAll
};