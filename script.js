// 初始化时的调试信息
console.log('Debug: script.js loaded');

let currentConfig = null;

// 解析配置文件
function parseConfig() {
    try {
        const configInput = document.getElementById('configInput');
        const configText = configInput.value;

        if (!configText.trim()) {
            showError('请输入配置文件内容');
            return;
        }

        // 验证 js-yaml 是否可用
        if (typeof jsyaml === 'undefined') {
            showError('配置解析器未正确加载，请刷新页面重试');
            return;
        }

        try {
            currentConfig = jsyaml.load(configText);
        } catch (parseError) {
            showError('YAML 格式错误：' + parseError.message);
            console.error('YAML parsing error:', parseError);
            return;
        }

        // 验证基本结构
        if (!currentConfig || typeof currentConfig !== 'object') {
            showError('无效的配置文件格式：配置必须是一个对象');
            return;
        }

        // 初始化基本字段
        initializeConfig();

        // 切换到编辑界面
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        
        // 渲染配置界面
        renderConfig();
    } catch (e) {
        showError('处理配置文件时出错：' + e.message);
        console.error('Config processing error:', e);
    }
}

// 初始化配置对象
function initializeConfig() {
    // 设置默认值
    currentConfig.port = currentConfig.port || 7890;
    currentConfig['socks-port'] = currentConfig['socks-port'] || 7891;
    currentConfig['allow-lan'] = currentConfig['allow-lan'] || false;
    currentConfig.mode = currentConfig.mode || 'Rule';
    
    // 确保数组字段存在
    currentConfig.proxies = Array.isArray(currentConfig.proxies) ? currentConfig.proxies : [];
    currentConfig['proxy-groups'] = Array.isArray(currentConfig['proxy-groups']) ? currentConfig['proxy-groups'] : [];
    currentConfig.rules = Array.isArray(currentConfig.rules) ? currentConfig.rules : [];
}

// 渲染配置界面
function renderConfig() {
    renderBasicConfig();
    renderProxies();
    renderProxyGroups();
    renderRules();
    
    // 重新计算所有展开内容的高度
    document.querySelectorAll('.section-content:not(.collapsed)').forEach(content => {
        content.style.maxHeight = content.scrollHeight + "px";
    });
}

// 渲染基础配置
function renderBasicConfig() {
    const basicConfigDiv = document.getElementById('basicConfig');
    basicConfigDiv.innerHTML = `
        <div class="config-item">
            <div class="mb-3">
                <label class="form-label">端口</label>
                <input type="number" class="form-control" value="${currentConfig.port || ''}" onchange="updateBasicConfig('port', this.value)">
            </div>
            <div class="mb-3">
                <label class="form-label">Socks 端口</label>
                <input type="number" class="form-control" value="${currentConfig['socks-port'] || ''}" onchange="updateBasicConfig('socks-port', this.value)">
            </div>
            <div class="mb-3">
                <label class="form-label">允许局域网</label>
                <select class="form-control" onchange="updateBasicConfig('allow-lan', this.value === 'true')">
                    <option value="true" ${currentConfig['allow-lan'] ? 'selected' : ''}>是</option>
                    <option value="false" ${!currentConfig['allow-lan'] ? 'selected' : ''}>否</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">模式</label>
                <select class="form-control" onchange="updateBasicConfig('mode', this.value)">
                    <option value="Rule" ${currentConfig.mode === 'Rule' ? 'selected' : ''}>规则模式</option>
                    <option value="Global" ${currentConfig.mode === 'Global' ? 'selected' : ''}>全局模式</option>
                    <option value="Direct" ${currentConfig.mode === 'Direct' ? 'selected' : ''}>直连模式</option>
                </select>
            </div>
        </div>
    `;
}

// 渲染代理列表
function renderProxies() {
    const proxyListDiv = document.getElementById('proxyList');
    proxyListDiv.innerHTML = '';
    
    if (Array.isArray(currentConfig.proxies)) {
        currentConfig.proxies.forEach((proxy, index) => {
            const proxyDiv = document.createElement('div');
            proxyDiv.className = 'config-item';
            proxyDiv.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">名称</label>
                    <input type="text" class="form-control" value="${proxy.name || ''}" onchange="updateProxy(${index}, 'name', this.value)">
                </div>
                <div class="mb-3">
                    <label class="form-label">类型</label>
                    <select class="form-control" onchange="updateProxy(${index}, 'type', this.value)">
                        <option value="ss" ${proxy.type === 'ss' ? 'selected' : ''}>Shadowsocks</option>
                        <option value="vmess" ${proxy.type === 'vmess' ? 'selected' : ''}>VMess</option>
                        <option value="trojan" ${proxy.type === 'trojan' ? 'selected' : ''}>Trojan</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">服务器</label>
                    <input type="text" class="form-control" value="${proxy.server || ''}" onchange="updateProxy(${index}, 'server', this.value)">
                </div>
                <div class="mb-3">
                    <label class="form-label">端口</label>
                    <input type="number" class="form-control" value="${proxy.port || ''}" onchange="updateProxy(${index}, 'port', this.value)">
                </div>
                <button class="btn btn-danger" onclick="deleteProxy(${index})">删除</button>
            `;
            proxyListDiv.appendChild(proxyDiv);
        });
    }
    
    // 更新内容高度
    updateSectionHeight(proxyListDiv);
}

// 渲染代理组
function renderProxyGroups() {
    const proxyGroupsDiv = document.getElementById('proxyGroupList');
    proxyGroupsDiv.innerHTML = '';
    
    if (Array.isArray(currentConfig['proxy-groups'])) {
        currentConfig['proxy-groups'].forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'config-item';
            groupDiv.id = `proxyGroup-${index}`;
            
            // 创建代理选择列表的HTML
            const proxyOptionsHtml = getAvailableProxyOptions(group.proxies || []);
            const selectedProxiesHtml = getSelectedProxiesHtml(group.proxies || [], index);
            
            groupDiv.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">名称</label>
                    <input type="text" class="form-control" value="${group.name || ''}" onchange="updateProxyGroup(${index}, 'name', this.value)">
                </div>
                <div class="mb-3">
                    <label class="form-label">类型</label>
                    <select class="form-control" onchange="updateProxyGroup(${index}, 'type', this.value)">
                        <option value="select" ${group.type === 'select' ? 'selected' : ''}>选择</option>
                        <option value="url-test" ${group.type === 'url-test' ? 'selected' : ''}>URL测试</option>
                        <option value="fallback" ${group.type === 'fallback' ? 'selected' : ''}>故障转移</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">代理列表</label>
                    <div class="proxy-list-container">
                        <div class="selected-proxies mb-2" id="selectedProxies-${index}">
                            ${selectedProxiesHtml}
                        </div>
                        <div class="input-group">
                            <select class="form-control" id="proxySelect-${index}">
                                ${proxyOptionsHtml}
                            </select>
                            <button class="btn btn-primary" onclick="addProxyToGroup(${index})">添加代理</button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-danger" onclick="deleteProxyGroup(${index})">删除代理组</button>
            `;
            proxyGroupsDiv.appendChild(groupDiv);
        });
    }
    
    updateSectionHeight(proxyGroupsDiv);
}

// 渲染规则
function renderRules() {
    const rulesDiv = document.getElementById('rulesList');
    rulesDiv.innerHTML = '';
    
    if (Array.isArray(currentConfig.rules)) {
        currentConfig.rules.forEach((rule, index) => {
            const ruleDiv = document.createElement('div');
            ruleDiv.className = 'config-item';
            ruleDiv.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">规则</label>
                    <input type="text" class="form-control" value="${rule || ''}" onchange="updateRule(${index}, this.value)">
                </div>
                <button class="btn btn-danger" onclick="deleteRule(${index})">删除</button>
                <button class="btn btn-secondary" onclick="toggleRule(${index})">折叠/展开</button>
            `;
            rulesDiv.appendChild(ruleDiv);
        });
    }
    
    // 更新内容高度
    updateSectionHeight(rulesDiv);
}

// 获取所有可用代理选项
function getProxyOptions(selectedProxies) {
    const allProxies = currentConfig.proxies || [];
    return allProxies.map(proxy => {
        const selected = selectedProxies.includes(proxy.name) ? 'selected' : '';
        return `<option value="${proxy.name}" ${selected}>${proxy.name}</option>`;
    }).join('');
}

// 获取可用的代理选项
function getAvailableProxyOptions(selectedProxies) {
    const allProxies = currentConfig.proxies || [];
    return allProxies.map(proxy => {
        const disabled = selectedProxies.includes(proxy.name) ? 'disabled' : '';
        return `<option value="${proxy.name}" ${disabled}>${proxy.name}</option>`;
    }).join('');
}

// 获取已选择的代理HTML
function getSelectedProxiesHtml(selectedProxies, groupIndex) {
    return selectedProxies.map((proxyName, index) => `
        <div class="selected-proxy mb-1">
            <span class="badge bg-primary">${proxyName}</span>
            <button class="btn btn-sm btn-danger ms-2" onclick="removeProxyFromGroup(${groupIndex}, ${index})">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `).join('');
}

// 更新代理组的代理列表
function updateProxyGroupProxies(groupIndex, selectElement) {
    const selectedProxies = Array.from(selectElement.selectedOptions).map(option => option.value);
    currentConfig['proxy-groups'][groupIndex].proxies = selectedProxies;
}

// 更新基础配置
function updateBasicConfig(key, value) {
    currentConfig[key] = value;
}

// 添加代理
function addProxy() {
    // 重置表单
    document.getElementById('addProxyForm').reset();
    // 显示 Shadowsocks 设置（默认）
    showProxySettings('ss');
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('addProxyModal'));
    modal.show();
}

// 显示对应的代理设置
function showProxySettings(type) {
    // 隐藏所有设置
    document.querySelectorAll('.proxy-settings').forEach(el => {
        el.style.display = 'none';
    });
    
    // 显示对应类型的设置
    const settingsDiv = document.getElementById(type + 'Settings');
    if (settingsDiv) {
        settingsDiv.style.display = 'block';
    }
}

// 监听代理类型变化
document.getElementById('proxyType').addEventListener('change', function() {
    showProxySettings(this.value);
});

// 提交添加代理
function submitAddProxy() {
    const form = document.getElementById('addProxyForm');
    
    // 验证必填字段
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // 获取基本信息
    const name = document.getElementById('proxyName').value;
    const type = document.getElementById('proxyType').value;
    const server = document.getElementById('proxyServer').value;
    const port = parseInt(document.getElementById('proxyPort').value);
    
    // 创建代理配置
    const proxy = {
        name,
        type,
        server,
        port
    };
    
    // 根据类型添加特定配置
    switch (type) {
        case 'ss':
            proxy.password = document.getElementById('ssPassword').value;
            proxy.cipher = document.getElementById('ssMethod').value;
            break;
        case 'vmess':
            proxy.uuid = document.getElementById('vmessUUID').value;
            proxy.alterId = parseInt(document.getElementById('vmessAlterId').value);
            break;
        case 'trojan':
            proxy.password = document.getElementById('trojanPassword').value;
            break;
    }
    
    // 初始化代理数组（如果不存在）
    if (!currentConfig.proxies) {
        currentConfig.proxies = [];
    }
    
    // 将新代理添加到数组开头
    currentConfig.proxies.unshift(proxy);
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('addProxyModal'));
    modal.hide();
    
    // 重新渲染代理列表
    renderProxies();
    
    // 显示成功消息
    showSuccess('代理添加成功');
}

// 显示成功消息
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // 添加到页面顶部
    const container = document.querySelector('.container');
    container.insertBefore(successDiv, container.firstChild);
    
    // 5秒后自动消失
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// 添加代理到代理组
function addProxyToGroup(groupIndex) {
    const selectElement = document.getElementById(`proxySelect-${groupIndex}`);
    const selectedProxy = selectElement.value;
    
    if (!selectedProxy) return;
    
    if (!currentConfig['proxy-groups'][groupIndex].proxies) {
        currentConfig['proxy-groups'][groupIndex].proxies = [];
    }
    
    // 将新代理添加到数组开头
    if (!currentConfig['proxy-groups'][groupIndex].proxies.includes(selectedProxy)) {
        currentConfig['proxy-groups'][groupIndex].proxies.unshift(selectedProxy);
        renderProxyGroups();
    }
}

// 从代理组中移除代理
function removeProxyFromGroup(groupIndex, proxyIndex) {
    currentConfig['proxy-groups'][groupIndex].proxies.splice(proxyIndex, 1);
    renderProxyGroups();
}

// 打开添加代理组模态框
function addProxyGroup() {
    // 重置表单
    document.getElementById('addProxyGroupForm').reset();
    // 设置默认值
    document.getElementById('proxyGroupUrl').value = 'http://www.gstatic.com/generate_204';
    document.getElementById('proxyGroupInterval').value = '300';
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('addProxyGroupModal'));
    modal.show();
}

// 提交添加代理组
function submitAddProxyGroup() {
    const form = document.getElementById('addProxyGroupForm');
    
    // 验证必填字段
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // 获取表单数据
    const name = document.getElementById('proxyGroupName').value;
    const type = document.getElementById('proxyGroupType').value;
    const url = document.getElementById('proxyGroupUrl').value;
    const interval = parseInt(document.getElementById('proxyGroupInterval').value);
    
    // 创建代理组配置
    const proxyGroup = {
        name,
        type,
        url,
        interval,
        proxies: [] // 初始化为空数组
    };
    
    // 初始化代理组数组（如果不存在）
    if (!currentConfig['proxy-groups']) {
        currentConfig['proxy-groups'] = [];
    }
    
    // 将新代理组添加到数组开头
    currentConfig['proxy-groups'].unshift(proxyGroup);
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('addProxyGroupModal'));
    modal.hide();
    
    // 重新渲染代理组列表
    renderProxyGroups();
    
    // 显示成功消息
    showSuccess('代理组添加成功');
}

// 监听代理组类型变化
document.addEventListener('DOMContentLoaded', function() {
    const proxyGroupType = document.getElementById('proxyGroupType');
    if (proxyGroupType) {
        proxyGroupType.addEventListener('change', function() {
            const urlTestOptions = document.getElementById('urlTestOptions');
            if (['url-test', 'fallback', 'load-balance'].includes(this.value)) {
                urlTestOptions.style.display = 'block';
            } else {
                urlTestOptions.style.display = 'none';
            }
        });
    }
});

// 生成并下载配置文件
function generateConfig() {
    const yamlStr = jsyaml.dump(currentConfig);
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    console.error('Error:', message);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // 5秒后自动隐藏错误信息
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 切换部分的显示/隐藏
function toggleSection(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.toggle-icon');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.classList.add('collapsed');
        content.style.maxHeight = '0';
        icon.style.transform = 'rotate(-90deg)';
    }
}

// 更新内容高度
function updateSectionHeight(section) {
    if (!section) return;
    
    const content = section.closest('.section-content');
    if (content && !content.classList.contains('collapsed')) {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

// 初始化所有部分
function initializeSections() {
    document.querySelectorAll('.section-header').forEach(header => {
        const content = header.nextElementSibling;
        const icon = header.querySelector('.toggle-icon');
        
        // 默认展开所有部分
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = 'rotate(0deg)';
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeSections();
});

// 折叠/展开代理组
function toggleProxyGroup(index) {
    const groupDiv = document.getElementById(`proxyGroup-${index}`);
    if (groupDiv) {
        groupDiv.classList.toggle('collapsed');
        updateSectionHeight(groupDiv);
    }
}

// 折叠/展开规则
function toggleRule(index) {
    const ruleDiv = document.getElementById(`rule-${index}`);
    if (ruleDiv) {
        ruleDiv.classList.toggle('collapsed');
        updateSectionHeight(ruleDiv);
    }
}

// 更新代理
function updateProxy(index, key, value) {
    currentConfig.proxies[index][key] = value;
}

// 删除代理
function deleteProxy(index) {
    currentConfig.proxies.splice(index, 1);
    renderProxies();
    // 重新渲染代理组，因为可能有组使用了被删除的代理
    renderProxyGroups();
}

// 添加代理组
function addProxyGroup() {
    // 重置表单
    document.getElementById('addProxyGroupForm').reset();
    // 设置默认值
    document.getElementById('proxyGroupUrl').value = 'http://www.gstatic.com/generate_204';
    document.getElementById('proxyGroupInterval').value = '300';
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('addProxyGroupModal'));
    modal.show();
}

// 更新代理组
function updateProxyGroup(index, key, value) {
    currentConfig['proxy-groups'][index][key] = value;
}

// 删除代理组
function deleteProxyGroup(index) {
    currentConfig['proxy-groups'].splice(index, 1);
    renderProxyGroups();
}

// 添加规则
function addRule() {
    // 重置表单
    document.getElementById('addRuleForm').reset();

    // 填充代理选项
    const proxySelect = document.getElementById('ruleProxy');
    proxySelect.innerHTML = '';

    // 添加 DIRECT 和 REJECT 选项
    proxySelect.add(new Option('DIRECT', 'DIRECT'));
    proxySelect.add(new Option('REJECT', 'REJECT'));

    // 添加所有代理和代理组
    if (currentConfig.proxies) {
        currentConfig.proxies.forEach(proxy => {
            proxySelect.add(new Option(proxy.name, proxy.name));
        });
    }
    if (currentConfig['proxy-groups']) {
        currentConfig['proxy-groups'].forEach(group => {
            proxySelect.add(new Option(group.name, group.name));
        });
    }

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('addRuleModal'));
    modal.show();
}

// 提交添加规则
function submitAddRule() {
    const form = document.getElementById('addRuleForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const type = document.getElementById('ruleType').value;
    const value = document.getElementById('ruleValue').value;
    const proxy = document.getElementById('ruleProxy').value;

    // 验证规则值
    if (!value && type !== 'MATCH') {
        showError('规则值不能为空');
        return;
    }

    // 创建规则字符串
    let rule;
    if (type === 'MATCH') {
        rule = `MATCH,${proxy}`;
    } else {
        rule = `${type},${value},${proxy}`;
    }

    // 添加规则到第一行
    if (!currentConfig.rules) {
        currentConfig.rules = [];
    }
    currentConfig.rules.unshift(rule);

    // 重新渲染规则列表
    renderRules();

    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('addRuleModal'));
    modal.hide();

    // 显示成功消息
    showSuccess('规则添加成功');
}

// 更新规则
function updateRule(index, value) {
    currentConfig.rules[index] = value;
}

// 删除规则
function deleteRule(index) {
    currentConfig.rules.splice(index, 1);
    renderRules();
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有部分
    initializeSections();
    
    // 监听代理类型变化
    const proxyTypeSelect = document.getElementById('proxyType');
    if (proxyTypeSelect) {
        proxyTypeSelect.addEventListener('change', function() {
            showProxySettings(this.value);
        });
    }
    
    // 初始化表单验证
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
});
