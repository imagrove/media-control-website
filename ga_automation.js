const { AnalyticsAdminServiceClient } = require('@google-analytics/admin');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = "/Users/npp/Documents/NI-Group/33_多媒体播控系统_精简版";
const KEY_FILE = "/Users/npp/Documents/NI-Group/30_Marketing_Lab/config/google-service-account.json";
const INDEX_HTML = path.join(PROJECT_DIR, "web/index.html");

async function run() {
    try {
        const client = new AnalyticsAdminServiceClient({
            keyFilename: KEY_FILE,
        });

        console.log("📡 正在获取 Google Analytics 账号...");
        const [accounts] = await client.listAccounts();
        
        if (accounts.length === 0) {
            console.error("❌ 未发现可用的账号，请确保已授权给服务账号。");
            return;
        }

        const account = accounts[0];
        console.log(`✅ 发现账号: ${account.displayName} (${account.name})`);

        console.log("🚀 正在创建资产 (Property)...");
        const [property] = await client.createProperty({
            property: {
                parent: account.name,
                displayName: "33_Multimedia_Control",
                timeZone: "Asia/Shanghai",
                currencyCode: "CNY",
            },
        });
        console.log(`✅ 资产创建成功: ${property.name}`);

        console.log("🚀 正在创建 Web 数据流 (Data Stream)...");
        const [dataStream] = await client.createDataStream({
            parent: property.name,
            dataStream: {
                type: 'WEB_DATA_STREAM',
                displayName: 'Web Stream',
                webStreamData: {
                    defaultUri: 'https://control.imagrove.com',
                },
            },
        });

        const measurementId = dataStream.webStreamData.measurementId;
        console.log(`✅ 获取衡量 ID: ${measurementId}`);

        console.log("📝 正在注入 HTML 代码...");
        let htmlContent = fs.readFileSync(INDEX_HTML, 'utf8');
        
        const gaSnippet = `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    </script>
`;

        if (htmlContent.includes('G-XXXXXXXXXX')) {
            // 替换掉占位符中的代码
            htmlContent = htmlContent.replace(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-XXXXXXXXXX"><\/script>[\s\S]*?gtag\('config', 'G-XXXXXXXXXX'\);[\s\S]*?<\/script>/, gaSnippet);
            // 同时去掉包裹它的注释符号（如果存在）
            htmlContent = htmlContent.replace('<!-- Google Analytics Placeholder -->', '<!-- Google Analytics Active -->');
            htmlContent = htmlContent.replace('<!-- <script', '<script');
            htmlContent = htmlContent.replace('</script> -->', '</script>');
        } else if (!htmlContent.includes(measurementId)) {
            htmlContent = htmlContent.replace('<head>', `<head>${gaSnippet}`);
        }

        fs.writeFileSync(INDEX_HTML, htmlContent);
        console.log(`✅ GA 代码已成功植入: ${INDEX_HTML}`);

    } catch (error) {
        console.error("❌ 自动化运行失败:", error.message);
    }
}

run();
