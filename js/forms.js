// 表单处理相关功能 - 增强版本

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
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
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

// 处理更新表单提交 - 支持更改山头和妖盟名
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
        
        const originalMountain = formData.get('originalMountain');
        const originalAlliance = formData.get('originalAlliance');
        const newMountain = formData.get('mountain').trim();
        const newAlliance = formData.get('alliance').trim();
        
        const allianceData = {
            mountain: newMountain,
            alliance: newAlliance,
            relation: formData.get('relation'),
            totalPower: parseFloat(formData.get('totalPower')) || 0,
            members: [],
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
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
        
        // 检查是否更改了山头或妖盟名
        const hasNameChange = (newMountain !== originalMountain || newAlliance !== originalAlliance);
        
        let success = false;
        
        if (window.allianceSystem.isAdmin) {
            // 管理员可以直接更新
            allianceData.approvedBy = window.allianceSystem.currentUser?.username || 'admin';
            
            if (hasNameChange) {
                // 如果更改了名称，需要先删除原数据，再添加新数据
                await window.AllianceUtils.deleteAllianceData(originalMountain, originalAlliance);
            }
            
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
            allianceData.originalMountain = originalMountain;
            allianceData.originalAlliance = originalAlliance;
            allianceData.hasNameChange = hasNameChange;
            
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

// 初始化输入辅助功能
function initUpdateHelpers() {
    const mountainInput = document.getElementById('updateMountain');
    const allianceInput = document.getElementById('updateAlliance');
    const mountainDropdown = document.getElementById('mountainDropdown');
    const allianceDropdown = document.getElementById('allianceDropdown');
    
    if (!mountainInput || !allianceInput) return;
    
    // 获取所有山头和妖盟选项
    const mountains = [...new Set(window.allianceSystem.allianceData.map(item => item.mountain))].sort();
    const alliances = [...new Set(window.allianceSystem.allianceData.map(item => item.alliance))].sort();
    
    // 山头输入辅助
    mountainInput.addEventListener('focus', () => {
        showHelperDropdown(mountainDropdown, mountains, (value) => {
            mountainInput.value = value;
            hideHelperDropdown(mountainDropdown);
        });
    });
    
    mountainInput.addEventListener('input', () => {
        const value = mountainInput.value.toLowerCase();
        const filtered = mountains.filter(m => m.toLowerCase().includes(value));
        showHelperDropdown(mountainDropdown, filtered, (selectedValue) => {
            mountainInput.value = selectedValue;
            hideHelperDropdown(mountainDropdown);
        });
    });
    
    // 妖盟输入辅助
    allianceInput.addEventListener('focus', () => {
        showHelperDropdown(allianceDropdown, alliances, (value) => {
            allianceInput.value = value;
            hideHelperDropdown(allianceDropdown);
        });
    });
    
    allianceInput.addEventListener('input', () => {
        const value = allianceInput.value.toLowerCase();
        const filtered = alliances.filter(a => a.toLowerCase().includes(value));
        showHelperDropdown(allianceDropdown, filtered, (selectedValue) => {
            allianceInput.value = selectedValue;
            hideHelperDropdown(allianceDropdown);
        });
    });
    
    // 点击其他地方隐藏下拉框
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-with-helper')) {
            hideHelperDropdown(mountainDropdown);
            hideHelperDropdown(allianceDropdown);
        }
    });
}

// 显示辅助下拉框
function showHelperDropdown(dropdown, items, onSelect) {
    if (!dropdown || items.length === 0) return;
    
    dropdown.innerHTML = items.map(item => 
        `<div class="helper-item" data-value="${item}">${item}</div>`
    ).join('');
    
    dropdown.classList.add('show');
    
    // 绑定点击事件
    dropdown.querySelectorAll('.helper-item').forEach(item => {
        item.addEventListener('click', () => {
            onSelect(item.dataset.value);
        });
    });
}

// 隐藏辅助下拉框
function hideHelperDropdown(dropdown) {
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// 从URL参数加载数据 - 增强版本
function loadFromURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const mountain = urlParams.get('mountain');
    const alliance = urlParams.get('alliance');
    
    if (mountain && alliance) {
        // 查找对应的数据
        const data = window.allianceSystem.allianceData.find(item => 
            item.mountain === mountain && item.alliance === alliance
        );
        
        if (data) {
            // 填充表单数据
            document.getElementById('updateMountain').value = data.mountain || '';
            document.getElementById('updateAlliance').value = data.alliance || '';
            document.getElementById('updateRelation').value = data.relation || '';
            document.getElementById('updateTotalPower').value = data.totalPower || '';
            
            // 填充车头信息
            document.getElementById('updateMember1Name').value = data.members?.[0]?.name || '';
            document.getElementById('updateMember1Power').value = data.members?.[0]?.power || '';
            document.getElementById('updateMember2Name').value = data.members?.[1]?.name || '';
            document.getElementById('updateMember2Power').value = data.members?.[1]?.power || '';
            
            // 存储原始数据
            document.getElementById('originalMountainValue').value = data.mountain;
            document.getElementById('originalAllianceValue').value = data.alliance;
            
            // 显示当前数据信息
            const infoDiv = document.getElementById('currentDataInfo');
            if (infoDiv) {
                document.getElementById('originalMountain').textContent = data.mountain;
                document.getElementById('originalAlliance').textContent = data.alliance;
                document.getElementById('originalUpdateTime').textContent = 
                    data.lastUpdated ? window.AllianceUtils.formatDate(data.lastUpdated) : '未知';
                infoDiv.style.display = 'block';
            }
        } else {
            window.AllianceUtils.showToast('未找到指定的妖盟数据', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }
}

// 删除妖盟 - 使用原始数据
async function deleteAlliance() {
    const originalMountain = document.getElementById('originalMountainValue')?.value;
    const originalAlliance = document.getElementById('originalAllianceValue')?.value;
    
    if (!originalMountain || !originalAlliance) {
        window.AllianceUtils.showToast('无法获取原始数据信息', 'error');
        return;
    }
    
    if (!confirm(`确认删除 ${originalMountain} 的 ${originalAlliance} 妖盟吗？`)) {
        return;
    }
    
    if (window.allianceSystem.isAdmin) {
        const success = await window.AllianceUtils.deleteAllianceData(originalMountain, originalAlliance);
        if (success) {
            window.AllianceUtils.showToast('妖盟删除成功！');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } else {
        const deleteRequest = {
            type: 'delete',
            mountain: originalMountain,
            alliance: originalAlliance,
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
    initUpdateHelpers,
    loadFromURLParams,
    deleteAlliance
};
