// 表单处理相关功能 - 更新版本

// 处理新增表单提交 - 确保包含时间戳
async function handleAddForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    try {
        const formData = new FormData(form);
        
        // 验证必填字段
        const requiredFields = ['mountain', 'alliance', 'relation', 'totalPower'];
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                window.AllianceUtils.showToast(`请填写${getFieldName(field)}`, 'error');
                return;
            }
        }
        
        const allianceData = {
            mountain: formData.get('mountain').trim(),
            alliance: formData.get('alliance').trim(),
            relation: formData.get('relation'),
            totalPower: parseFloat(formData.get('totalPower')) || 0,
            members: [],
            timestamp: new Date().toISOString(), // 提交时间戳
            lastUpdated: new Date().toISOString() // 最后更新时间戳
        };
        
        // 处理车头信息
        if (formData.get('member1Name') && formData.get('member1Power')) {
            allianceData.members.push({
                name: formData.get('member1Name').trim(),
                power: parseFloat(formData.get('member1Power')) || 0
            });
        }
        
        if (formData.get('member2Name') && formData.get('member2Power')) {
            allianceData.members.push({
                name: formData.get('member2Name').trim(),
                power: parseFloat(formData.get('member2Power')) || 0
            });
        }
        
        let success = false;
        
        if (window.allianceSystem.isAdmin) {
            // 管理员可以直接添加
            const exists = window.allianceSystem.allianceData.some(item => 
                item.mountain === allianceData.mountain && item.alliance === allianceData.alliance
            );
            
            if (exists) {
                if (confirm(`${allianceData.mountain} 的 ${allianceData.alliance} 已存在，是否覆盖？`)) {
                    // 如果是覆盖，添加审核者信息
                    allianceData.approvedBy = window.allianceSystem.currentUser?.username || 'admin';
                    success = await window.AllianceUtils.saveAllianceData(allianceData);
                }
            } else {
                allianceData.approvedBy = window.allianceSystem.currentUser?.username || 'admin';
                success = await window.AllianceUtils.saveAllianceData(allianceData);
            }
            
            if (success) {
                window.AllianceUtils.showToast('数据提交成功！');
                form.reset();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } else {
            // 普通用户需要审核
            allianceData.type = 'new';
            success = await window.AllianceUtils.savePendingData(allianceData);
            
            if (success) {
                window.AllianceUtils.showToast('数据已提交，等待管理员审核');
                form.reset();
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        }
    } catch (error) {
        console.error('提交表单错误:', error);
        window.AllianceUtils.showToast('提交失败，请稍后重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// 处理更新表单提交 - 确保包含时间戳
async function handleUpdateForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
    
    try {
        const formData = new FormData(form);
        
        // 验证必填字段
        const requiredFields = ['mountain', 'alliance', 'relation', 'totalPower'];
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                window.AllianceUtils.showToast(`请填写${getFieldName(field)}`, 'error');
                return;
            }
        }
        
        const allianceData = {
            mountain: formData.get('mountain').trim(),
            alliance: formData.get('alliance').trim(),
            relation: formData.get('relation'),
            totalPower: parseFloat(formData.get('totalPower')) || 0,
            members: [],
            timestamp: new Date().toISOString(), // 更新时间戳
            lastUpdated: new Date().toISOString() // 最后更新时间戳
        };
        
        // 处理车头信息
        if (formData.get('member1Name') && formData.get('member1Power')) {
            allianceData.members.push({
                name: formData.get('member1Name').trim(),
                power: parseFloat(formData.get('member1Power')) || 0
            });
        }
        
        if (formData.get('member2Name') && formData.get('member2Power')) {
            allianceData.members.push({
                name: formData.get('member2Name').trim(),
                power: parseFloat(formData.get('member2Power')) || 0
            });
        }
        
        let success = false;
        
        if (window.allianceSystem.isAdmin) {
            // 管理员可以直接更新
            allianceData.approvedBy = window.allianceSystem.currentUser?.username || 'admin';
            success = await window.AllianceUtils.saveAllianceData(allianceData);
            
            if (success) {
                window.AllianceUtils.showToast('数据更新成功！');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } else {
            // 普通用户需要审核
            allianceData.type = 'update';
            success = await window.AllianceUtils.savePendingData(allianceData);
            
            if (success) {
                window.AllianceUtils.showToast('修改已提交，等待管理员审核');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        }
    } catch (error) {
        console.error('更新表单错误:', error);
        window.AllianceUtils.showToast('更新失败，请稍后重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// 加载山头列表用于更新
function loadMountains() {
    const mountains = [...new Set(window.allianceSystem.allianceData.map(item => item.mountain))].sort();
    const select = document.getElementById('updateMountain');
    
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择山头</option>';
    mountains.forEach(mountain => {
        const option = document.createElement('option');
        option.value = mountain;
        option.textContent = mountain;
        select.appendChild(option);
    });
}

// 加载妖盟列表
function loadAlliances() {
    const mountain = document.getElementById('updateMountain')?.value;
    const select = document.getElementById('updateAlliance');
    
    if (!select || !mountain) {
        if (select) select.innerHTML = '<option value="">请先选择山头</option>';
        return;
    }
    
    const alliances = window.allianceSystem.allianceData
        .filter(item => item.mountain === mountain)
        .map(item => item.alliance);
    
    select.innerHTML = '<option value="">请选择妖盟</option>';
    alliances.forEach(alliance => {
        const option = document.createElement('option');
        option.value = alliance;
        option.textContent = alliance;
        select.appendChild(option);
    });
}

// 加载妖盟数据到表单
function loadAllianceData() {
    const mountain = document.getElementById('updateMountain')?.value;
    const alliance = document.getElementById('updateAlliance')?.value;
    
    if (!mountain || !alliance) return;
    
    const data = window.allianceSystem.allianceData.find(item => 
        item.mountain === mountain && item.alliance === alliance
    );
    
    if (data) {
        document.getElementById('updateRelation').value = data.relation || '';
        document.getElementById('updateTotalPower').value = data.totalPower || '';
        
        document.getElementById('updateMember1Name').value = data.members?.[0]?.name || '';
        document.getElementById('updateMember1Power').value = data.members?.[0]?.power || '';
        document.getElementById('updateMember2Name').value = data.members?.[1]?.name || '';
        document.getElementById('updateMember2Power').value = data.members?.[1]?.power || '';
    }
}

// 删除妖盟
async function deleteAlliance() {
    const mountain = document.getElementById('updateMountain')?.value;
    const alliance = document.getElementById('updateAlliance')?.value;
    
    if (!mountain || !alliance) {
        window.AllianceUtils.showToast('请先选择要删除的妖盟', 'error');
        return;
    }
    
    if (!confirm(`确认删除 ${mountain} 的 ${alliance} 妖盟吗？`)) {
        return;
    }
    
    if (window.allianceSystem.isAdmin) {
        const success = await window.AllianceUtils.deleteAllianceData(mountain, alliance);
        if (success) {
            window.AllianceUtils.showToast('妖盟删除成功！');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } else {
        const deleteRequest = {
            type: 'delete',
            mountain: mountain,
            alliance: alliance,
            timestamp: new Date().toISOString()
        };
        
        const success = await window.AllianceUtils.savePendingData(deleteRequest);
        if (success) {
            window.AllianceUtils.showToast('删除申请已提交，等待管理员审核');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    }
}

// 从URL参数加载数据
function loadFromURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const mountain = urlParams.get('mountain');
    const alliance = urlParams.get('alliance');
    
    if (mountain && alliance) {
        setTimeout(() => {
            const mountainSelect = document.getElementById('updateMountain');
            if (mountainSelect) {
                mountainSelect.value = mountain;
                loadAlliances();
                
                setTimeout(() => {
                    const allianceSelect = document.getElementById('updateAlliance');
                    if (allianceSelect) {
                        allianceSelect.value = alliance;
                        loadAllianceData();
                    }
                }, 200);
            }
        }, 500);
    }
}

// 获取字段中文名称
function getFieldName(field) {
    const fieldNames = {
        mountain: '山头名称',
        alliance: '妖盟名称',
        relation: '妖盟关系',
        totalPower: '总战力'
    };
    return fieldNames[field] || field;
}

// 导出功能
window.AllianceForms = {
    handleAddForm,
    handleUpdateForm,
    loadMountains,
    loadAlliances,
    loadAllianceData,
    deleteAlliance,
    loadFromURLParams
};