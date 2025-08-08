const fs = require('fs');
const path = require('path');

function buildCleanPath(currentPath, currentObj) {
    if (typeof currentPath !== 'string') {
        return '';
    }

    let cleanPath = currentPath
        .replace(/\.properties\./g, '.')
        .replace(/\.oneOf\.\d+/g, '')
        .replace(/\.allOf\.\d+/g, '')
        .replace(/\.items/g, '')
        .replace(/\.additionalProperties/g, '')
        .replace(/^\.|\.$/g, '')
        .replace(/\.$/, '');

    if (currentPath.includes('.oneOf.') && currentObj && Object.prototype.hasOwnProperty.call(currentObj, 'const')) {
        const enumValue = currentObj.const;
        cleanPath = cleanPath + '.' + enumValue;
    }

    return cleanPath;
}

function extractDescriptions(obj, currentPath = '', result = {}) {
    if (typeof obj !== 'object' || obj === null) {
        return result;
    }

    for (const [key, value] of Object.entries(obj)) {
        if (key === 'description' && typeof value === 'string') {
            // 生成简化的路径，忽略 properties、oneOf、allOf 等中间路径
            const cleanPath = buildCleanPath(currentPath, obj);

            if (cleanPath) {
                result[cleanPath] = {
                    "en": value
                };
            }
        } else if (typeof value === 'object') {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            extractDescriptions(value, newPath, result);
        }
    }

    return result;
}

function mergeWithExistingTranslations(newDescriptions, existingI18n) {
    const merged = {};

    for (const [key, newValue] of Object.entries(newDescriptions)) {
        merged[key] = { ...newValue }; // 复制新的内容

        // 如果现有文件中存在这个key，将非"en"的所有语言key都附加过来
        if (existingI18n[key]) {
            for (const [langKey, langValue] of Object.entries(existingI18n[key])) {
                if (langKey !== 'en') {
                    merged[key][langKey] = langValue;
                }
            }
        }
    }

    return merged;
}

function translateDescriptions(obj, i18nData, currentPath = '') {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
        if (key === 'description' && typeof value === 'string') {
            // 生成简化的路径来查找翻译
            const cleanPath = buildCleanPath(currentPath, obj);

            // 查找中文翻译
            if (cleanPath && i18nData[cleanPath] && i18nData[cleanPath]['zh-CN']) {
                result[key] = i18nData[cleanPath]['zh-CN'];
            } else {
                result[key] = value; // 保持原文
            }
        } else if (typeof value === 'object') {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            result[key] = translateDescriptions(value, i18nData, newPath);
        } else {
            result[key] = value;
        }
    }

    return result;
}

function main() {
    try {
        // 读取 schema.json 文件
        const schemaPath = path.join(__dirname, '..', 'syntaxes', 'schema.json');
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaContent);

        // 只处理 definitions 部分
        const definitions = schema.$defs || {};

        // 提取所有 description
        const descriptions = extractDescriptions(definitions);

        // 排序结果
        const sortedDescriptions = {};
        Object.keys(descriptions).sort().forEach(key => {
            sortedDescriptions[key] = descriptions[key];
        });

        // 读取现有的 schema.i18n.json 文件
        const i18nPath = path.join(__dirname, '..', 'syntaxes', 'schema.i18n.json');
        let existingI18n = {};

        if (fs.existsSync(i18nPath)) {
            try {
                const existingContent = fs.readFileSync(i18nPath, 'utf-8');
                existingI18n = JSON.parse(existingContent);
                console.log('已读取现有的 schema.i18n.json 文件');
            } catch (error) {
                console.log('读取现有 schema.i18n.json 文件失败，将创建新文件');
            }
        } else {
            console.log('未找到现有的 schema.i18n.json 文件，将创建新文件');
        }

        // 合并翻译内容
        const finalDescriptions = mergeWithExistingTranslations(sortedDescriptions, existingI18n);

        // 更新 schema.i18n.json 文件
        fs.writeFileSync(i18nPath, JSON.stringify(finalDescriptions, null, 2));
        console.log(`已更新 schema.i18n.json 文件`);

        // 生成中文版的 schema.zh-cn.json（只处理 definitions 部分）
        const translatedDefinitions = translateDescriptions(schema.$defs, finalDescriptions);
        const translatedSchema = {
            ...schema,
            $defs: translatedDefinitions
        };

        const zhCnPath = path.join(__dirname, '..', 'syntaxes', 'schema.zh-cn.json');
        fs.writeFileSync(zhCnPath, JSON.stringify(translatedSchema, null, 2));
        console.log(`已生成中文版 schema.zh-cn.json 文件`);

        console.log('\n✅ 处理完成！');
    } catch (error) {
        console.error('错误:', error.message);
    }
}

main();