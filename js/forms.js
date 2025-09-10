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

// 从URL参数加载数据 - 修复版本，增加调试和重试机制
function loadFromURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const mountain = urlParams.get('mountain');
    const alliance = urlParams.get('alliance');
    
    console.log('loadFromURLParams called with:', { mountain, alliance });
    
    if (mountain && alliance) {
        // 添加重试机制，等待数据加载完成
        function findDataWithRetry(attempt = 1, maxAttempts = 10) {
            console.log(`查找数据尝试 ${attempt}/${maxAttempts}`);
            console.log('当前 allianceData 长度:', window.allianceSystem?.allianceData?.length || 0);
            console.log('当前 allianceData:', window.allianceSystem?.allianceData);
            
            // 检查数据是否已加载
            if (!window.allianceSystem || !window.allianceSystem.allianceData) {
                console.log('allianceSystem 或 allianceData 未初始化，等待中...');
                if (attempt < maxAttempts) {
                    setTimeout(() => findDataWithRetry(attempt + 1, maxAttempts), 1000);
                    return;
                } else {
                    console.error('数据加载超时');
                    window.AllianceUtils.showToast('数据加载超时，请稍后重试', 'error');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                    return;
                }
            }
            
            // 查找对应的数据
            console.log('搜索条件:', { mountain, alliance });
            const data = window.allianceSystem.allianceData.find(item => {
                console.log('比较:', {
                    itemMountain: item.mountain,
                    itemAlliance: item.alliance,
                    mountainMatch: item.mountain === mountain,
                    allianceMatch: item.alliance === alliance
                });
                return item.mountain === mountain && item.alliance === alliance;
            });
            
            console.log('找到的数据:', data);
            
            if (data) {
                console.log('数据找到，开始填充表单');
                fillFormData(data, mountain, alliance);
            } else {
                console.log('未找到数据，当前数据列表:');
                window.allianceSystem.allianceData.forEach((item, index) => {
                    console.log(`${index}: ${item.mountain} - ${item.alliance}`);
                });
                
                if (attempt < maxAttempts) {
                    console.log('未找到数据，重试中...');
                    setTimeout(() => findDataWithRetry(attempt + 1, maxAttempts), 1000);
                } else {
                    console.error('最终未找到指定的妖盟数据');
                    window.AllianceUtils.showToast('未找到指定的妖盟数据', 'error');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            }
        }
        
        // 开始查找数据
        findDataWithRetry();
    } else {
        console.log('URL参数不完整:', { mountain, alliance });
    }
}

function fillFormData(data, mountain, alliance) {
    try {
        console.log('开始填充表单数据:', data);
        
        // 填充表单数据
        const elements = {
            updateMountain: document.getElementById('updateMountain'),
            updateAlliance: document.getElementById('updateAlliance'),
            updateRelation: document.getElementById('updateRelation'),
            updateTotalPower: document.getElementById('updateTotalPower'),
            updateMember1Name: document.getElementById('updateMember1Name'),
            updateMember1Power: document.getElementById('updateMember1Power'),
            updateMember2Name: document.getElementById('updateMember2Name'),
            updateMember2Power: document.getElementById('updateMember2Power'),
            originalMountainValue: document.getElementById('originalMountainValue'),
            originalAllianceValue: document.getElementById('originalAllianceValue')
        };
        
        // 检查必要元素是否存在
        const missingElements = Object.entries(elements).filter(([key, el]) => !el);
        if (missingElements.length > 0) {
            console.warn('缺少以下表单元素:', missingElements.map(([key]) => key));
        }
        
        // 填充基本信息
        if (elements.updateMountain) elements.updateMountain.value = data.mountain || '';
        if (elements.updateAlliance) elements.updateAlliance.value = data.alliance || '';
        if (elements.updateRelation) elements.updateRelation.value = data.relation || '';
        if (elements.updateTotalPower) elements.updateTotalPower.value = data.totalPower || '';
        
        // 填充车头信息
        if (elements.updateMember1Name) elements.updateMember1Name.value = data.members?.[0]?.name || '';
        if (elements.updateMember1Power) elements.updateMember1Power.value = data.members?.[0]?.power || '';
        if (elements.updateMember2Name) elements.updateMember2Name.value = data.members?.[1]?.name || '';
        if (elements.updateMember2Power) elements.updateMember2Power.value = data.members?.[1]?.power || '';
        
        // 存储原始数据
        if (elements.originalMountainValue) elements.originalMountainValue.value = data.mountain;
        if (elements.originalAllianceValue) elements.originalAllianceValue.value = data.alliance;
        
        // 显示当前数据信息
        const infoDiv = document.getElementById('currentDataInfo');
        if (infoDiv) {
            const originalMountainEl = document.getElementById('originalMountain');
            const originalAllianceEl = document.getElementById('originalAlliance');
            const originalUpdateTimeEl = document.getElementById('originalUpdateTime');
            
            if (originalMountainEl) originalMountainEl.textContent = data.mountain;
            if (originalAllianceEl) originalAllianceEl.textContent = data.alliance;
            if (originalUpdateTimeEl) {
                originalUpdateTimeEl.textContent = data.lastUpdated ? 
                    window.AllianceUtils.formatDate(data.lastUpdated) : '未知';
            }
            infoDiv.style.display = 'block';
        }
        
        console.log('表单数据填充完成');
        window.AllianceUtils.showToast('数据加载成功', 'success');
        
    } catch (error) {
        console.error('填充表单数据时出错:', error);
        window.AllianceUtils.showToast('数据填充失败', 'error');
    }
}

function fillFormData(data, mountain, alliance) {
    try {
        console.log('开始填充表单数据:', data);
        
        // 填充表单数据
        const elements = {
            updateMountain: document.getElementById('updateMountain'),
            updateAlliance: document.getElementById('updateAlliance'),
            updateRelation: document.getElementById('updateRelation'),
            updateTotalPower: document.getElementById('updateTotalPower'),
            updateMember1Name: document.getElementById('updateMember1Name'),
            updateMember1Power: document.getElementById('updateMember1Power'),
            updateMember2Name: document.getElementById('updateMember2Name'),
            updateMember2Power: document.getElementById('updateMember2Power'),
            originalMountainValue: document.getElementById('originalMountainValue'),
            originalAllianceValue: document.getElementById('originalAllianceValue')
        };
        
        // 检查必要元素是否存在
        const missingElements = Object.entries(elements).filter(([key, el]) => !el);
        if (missingElements.length > 0) {
            console.warn('缺少以下表单元素:', missingElements.map(([key]) => key));
        }
        
        // 填充基本信息
        if (elements.updateMountain) elements.updateMountain.value = data.mountain || '';
        if (elements.updateAlliance) elements.updateAlliance.value = data.alliance || '';
        if (elements.updateRelation) elements.updateRelation.value = data.relation || '';
        if (elements.updateTotalPower) elements.updateTotalPower.value = data.totalPower || '';
        
        // 填充车头信息
        if (elements.updateMember1Name) elements.updateMember1Name.value = data.members?.[0]?.name || '';
        if (elements.updateMember1Power) elements.updateMember1Power.value = data.members?.[0]?.power || '';
        if (elements.updateMember2Name) elements.updateMember2Name.value = data.members?.[1]?.name || '';
        if (elements.updateMember2Power) elements.updateMember2Power.value = data.members?.[1]?.power || '';
        
        // 存储原始数据
        if (elements.originalMountainValue) elements.originalMountainValue.value = data.mountain;
        if (elements.originalAllianceValue) elements.originalAllianceValue.value = data.alliance;
        
        // 显示当前数据信息
        const infoDiv = document.getElementById('currentDataInfo');
        if (infoDiv) {
            const originalMountainEl = document.getElementById('originalMountain');
            const originalAllianceEl = document.getElementById('originalAlliance');
            const originalUpdateTimeEl = document.getElementById('originalUpdateTime');
            
            if (originalMountainEl) originalMountainEl.textContent = data.mountain;
            if (originalAllianceEl) originalAllianceEl.textContent = data.alliance;
            if (originalUpdateTimeEl) {
                originalUpdateTimeEl.textContent = data.lastUpdated ? 
                    window.AllianceUtils.formatDate(data.lastUpdated) : '未知';
            }
            infoDiv.style.display = 'block';
        }
        
        console.log('表单数据填充完成');
        window.AllianceUtils.showToast('数据加载成功', 'success');
        
    } catch (error) {
        console.error('填充表单数据时出错:', error);
        window.AllianceUtils.showToast('数据填充失败', 'error');
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
