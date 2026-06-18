// ==========================================================================

// 121的龟类养护站 - 核心业务大脑 (app.js)

// ==========================================================================



const QWEATHER_API_KEY = "431f5dfc02a546fb9b880b4459314678";
    const QWEATHER_API_HOST = "mn4nmvcg77.re.qweatherapi.com";

    // ===== 城市定位状态 =====
    // 默认杭州，用户选择后自动保存到 localStorage
    let currentLocation = {
      id: "101210101",
      name: "杭州",
      adm1: "浙江省",
      adm2: "杭州",
      lat: "30.24603",
      lon: "120.21079"
    };

    // 从 localStorage 恢复上次选择的城市
    try {
      const saved = localStorage.getItem("qweather_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          currentLocation = parsed;
        }
      }
    } catch (e) {
      // localStorage 读取失败，使用默认值
    }

    // ===== 邀请码配置 =====
    // 有效邀请码列表 — 只有持有邀请码的人才能注册
    // 生成规则：TURTLE-XXXX 格式，可根据需要增删
    const VALID_INVITE_CODES = [
      "TURTLE-2026",
      "TURTLE-GUIGU",
      "TURTLE-121",
      "TURTLE-FRIEND"
    ];

    function isValidInviteCode(code) {
      if (!code) return false;
      const normalized = code.trim().toUpperCase();
      return VALID_INVITE_CODES.includes(normalized);
    }

    const BMOB_APPLICATION_ID = "742f16bcc0203f6f8ec2cc222eccacc9";
    const BMOB_REST_API_KEY = "4c9ce5f4b49032086bea11863d0d817e";
    const BMOB_SECRET_KEY = "5d0b82ad4b300afa";
    const BMOB_API_SAFE_CODE = "1234567891234567";
    const BMOB_SDK_URLS = [
      "https://cdn.jsdelivr.net/npm/hydrogen-js-sdk/dist/Bmob-2.2.5.min.js",
      "https://cdn.jsdelivr.net/npm/hydrogen-js-sdk@2.2.5/dist/Bmob-2.2.5.min.js",
      "https://unpkg.com/hydrogen-js-sdk/dist/Bmob-2.2.5.min.js"
    ];

    // ===== API 模式判断 =====
    // localhost/127.0.0.1 → 走本地代理 server.js（绕过浏览器代理干扰）
    // Vercel 公网部署（vercel.app 域名） → 走 Vercel Serverless Function 代理 /api/bmob
    // 其他 → 直接调用 Bmob REST API（Bmob 已开启 CORS *）
    const hostname = location.hostname;
    const IS_LOCALHOST = hostname === "localhost" || hostname === "127.0.0.1";
    const IS_VERCEL = hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel.sh");
    // 在本地或 Vercel 环境下都使用代理模式，避免跨域和网络限制
    const USE_LOCAL_PROXY = IS_LOCALHOST || IS_VERCEL;
    const BMOB_API_BASE = "/api/bmob";

const speciesCatalog = [
  { id: "species_spotted_turtle", name: "星点水龟", scientificName: "Clemmys guttata", minTemp: 22, maxTemp: 27, canHibernate: true, enabled: true },
  { id: "species_narrow_bridge", name: "窄桥匣龟", scientificName: "Claudius angustatus", minTemp: 24, maxTemp: 30, canHibernate: false, enabled: true },
      { id: "species_box", name: "黄缘闭壳龟", scientificName: "Cuora flavomarginata", minTemp: 24, maxTemp: 29, canHibernate: true, enabled: true },
  { id: "species_yellow_headed_box", name: "黄额闭壳龟", scientificName: "Cuora galbinifrons", minTemp: 24, maxTemp: 29, canHibernate: false, enabled: true },
  { id: "species_three_striped_box", name: "三线闭壳龟", scientificName: "Cuora trifasciata", minTemp: 25, maxTemp: 30, canHibernate: false, enabled: true },
      { id: "species_eastern_mud", name: "东方泥龟", scientificName: "Kinosternon subrubrum", minTemp: 23, maxTemp: 28, canHibernate: true, enabled: true },
  { id: "species_florida_mud", name: "佛罗里达泥龟", scientificName: "Kinosternon steindachneri", minTemp: 24, maxTemp: 29, canHibernate: true, enabled: true },
      { id: "species_striped_mud", name: "斑纹泥龟", scientificName: "Kinosternon baurii", minTemp: 24, maxTemp: 29, canHibernate: true, enabled: true },
      { id: "species_pond", name: "黄喉拟水龟", scientificName: "Mauremys mutica", minTemp: 25, maxTemp: 29, canHibernate: true, enabled: true },
  { id: "species_helmeted_mud", name: "头盔泥龟", scientificName: "Pelomedusa subrufa", minTemp: 25, maxTemp: 30, canHibernate: false, enabled: true },
  { id: "species_savannah_side_neck", name: "萨尔文巨型蛋龟", scientificName: "Staurotypus salvinii", minTemp: 25, maxTemp: 30, canHibernate: false, enabled: true },
  { id: "species_razorback_musk", name: "剃刀麝香龟", scientificName: "Sternotherus carinatus", minTemp: 23, maxTemp: 29, canHibernate: true, enabled: true },
      { id: "species_tiger_musk", name: "虎纹麝香龟", scientificName: "Sternotherus minor peltifer", minTemp: 23, maxTemp: 29, canHibernate: true, enabled: true },
  { id: "species_common_musk", name: "麝香龟", scientificName: "Sternotherus odoratus", minTemp: 22, maxTemp: 28, canHibernate: true, enabled: true },
  { id: "species_loggerhead_musk", name: "果核泥龟", scientificName: "Sternotherus minor", minTemp: 23, maxTemp: 29, canHibernate: true, enabled: true }
    ].sort((a, b) => a.scientificName.localeCompare(b.scientificName));

    const speciesData = speciesCatalog.reduce((data, item) => {
      data[item.id] = item;
      return data;
    }, {});

    const lifeStageData = {
      hatchling: "龟苗",
      subadult: "压成体",
      mature: "成熟个体",
      breeder: "稳产种龟"
    };

    let currentSpecies = "species_pond";
    let environmentData = null;
    let turtleRecords = [];
    let bmobReady = false;
    let bmobMode = "none";
    const pendingPhotoFiles = {};

    const speciesSelect = document.getElementById("speciesSelect");
    const speciesDirectory = document.getElementById("speciesDirectory");
    const weatherButton = document.getElementById("weatherButton");
    const result = document.getElementById("result");
    const debugPanel = document.getElementById("debugPanel");
    // 城市定位 DOM 节点
    const citySearchInput = document.getElementById("citySearchInput");
    const citySearchResults = document.getElementById("citySearchResults");
    const geoLocateButton = document.getElementById("geoLocateButton");
    const currentLocationLabel = document.getElementById("currentLocationLabel");
    const bmobStatus = document.getElementById("bmobStatus");
    const archiveMessage = document.getElementById("archiveMessage");
    const turtleList = document.getElementById("turtleList");
    const createTurtleButton = document.getElementById("createTurtleButton");
    const refreshTurtlesButton = document.getElementById("refreshTurtlesButton");

    const nicknameInput = document.getElementById("nicknameInput");
    const recordSpeciesSelect = document.getElementById("recordSpeciesSelect");
    const birthYearInput = document.getElementById("birthYearInput");
    const lifeStageSelect = document.getElementById("lifeStageSelect");
    const isMatureInput = document.getElementById("isMatureInput");

    // --- 登录/注册 DOM 节点 ---
    const authOverlay      = document.getElementById("authOverlay");
    const mainApp          = document.getElementById("mainApp");
    const authUsername     = document.getElementById("authUsername");
    const authPassword     = document.getElementById("authPassword");
    const authInviteCode   = document.getElementById("authInviteCode");
    const authMessage      = document.getElementById("authMessage");
    const loginButton      = document.getElementById("loginButton");
    const registerButton   = document.getElementById("registerButton");
    const logoutButton     = document.getElementById("logoutButton");
    const currentUserLabel = document.getElementById("currentUserLabel");
    const rememberLoginCheckbox = document.getElementById("rememberLoginCheckbox");
    const autoLoginCheckbox     = document.getElementById("autoLoginCheckbox");
    const editLocationButton    = document.getElementById("editLocationButton");
    const locationEditArea      = document.getElementById("locationEditArea");

    function loadExternalScript(src) {
      return new Promise((resolve, reject) => {
        if ([...document.scripts].some((script) => script.src === src && window.Bmob)) {
          resolve(src);
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve(src);
        script.onerror = () => reject(new Error(`无法加载 ${src}`));
        document.head.appendChild(script);
      });
    }

    function getSpeciesInfo(value) {
      if (speciesData[value]) {
        return speciesData[value];
      }

      return speciesCatalog.find((item) => item.name === value) || speciesData.species_pond;
    }

    function speciesDisplayName(value) {
      return getSpeciesInfo(value)?.name || value || "未记录品种";
    }

    function speciesOptionLabel(item) {
      return `${item.name} · ${item.scientificName}`;
    }

    function getSpeciesCounts() {
      return turtleRecords.reduce((counts, record) => {
        const speciesInfo = getSpeciesInfo(readField(record, "species"));
        counts[speciesInfo.id] = (counts[speciesInfo.id] || 0) + 1;
        return counts;
      }, {});
    }

    function getDominantEnabledSpeciesId() {
      const counts = getSpeciesCounts();
      const sorted = Object.entries(counts)
        .filter(([speciesId]) => speciesData[speciesId]?.enabled)
        .sort((a, b) => b[1] - a[1]);

      return sorted[0]?.[0] || currentSpecies;
    }

    function syncCurrentSpeciesFromRecords() {
      currentSpecies = getDominantEnabledSpeciesId();
      if (speciesSelect) speciesSelect.value = currentSpecies;
      if (recordSpeciesSelect && !recordSpeciesSelect.value) {
        recordSpeciesSelect.value = currentSpecies;
      }
    }

    function renderSpeciesCountSummary() {
      if (turtleRecords.length === 0) {
        return `
          <div class="species-summary-card">
            <strong>当前养护档案</strong>
            尚未建立龟类档案，养护算法暂按黄喉拟水龟作为默认品种。
        `;
      }

      const counts = getSpeciesCounts();
      const items = Object.entries(counts)
        .sort((a, b) => speciesDisplayName(a[0]).localeCompare(speciesDisplayName(b[0]), "zh-CN"))
        .map(([speciesId, count]) => `
          <div class="species-count-pill">
            <div class="species-count-name">${speciesDisplayName(speciesId)}</div>
            <div class="species-count-value">
              <span class="species-count-number">${count}</span>
              <span class="species-count-unit">只</span>
            </div>
          </div>
        `).join("");

      return `
        <div class="species-summary-card">
          <strong>当前养护档案</strong>
          <div class="species-summary-meta">算法基准：${speciesDisplayName(currentSpecies)} · 已建档 ${turtleRecords.length} 只</div>
          <div class="species-count-list">${items}</div>
        </div>
      `;
    }

    function populateSpeciesControls() {
  const allOptions = speciesCatalog
    .map((item) => `<option value="${item.id}">${speciesOptionLabel(item)}</option>`)
    .join("");

      speciesSelect.innerHTML = allOptions;
      recordSpeciesSelect.innerHTML = allOptions;
      speciesSelect.value = currentSpecies;
      recordSpeciesSelect.value = currentSpecies;
      renderSpeciesDirectory();
    }

    function renderSpeciesDirectory() {
      const groups = speciesCatalog.reduce((result, item) => {
        const letter = item.scientificName.slice(0, 1).toUpperCase();
        if (!result[letter]) result[letter] = [];
        result[letter].push(item);
        return result;
      }, {});
      const letters = Object.keys(groups).sort();

      const directoryHtml = letters.map((letter) => `
        <div class="species-group" id="species-letter-${letter}">
          <div class="species-letter">${letter}</div>
          ${groups[letter].map((item) => `
            <button
              class="species-option-card ${item.id === currentSpecies ? "active" : ""}"
              type="button"
              onclick="selectSpecies('${item.id}')"
            >
              <span class="species-cn">${item.name}</span>
              <span class="species-latin">${item.scientificName}</span>
            </button>
          `).join("")}
        </div>
      `).join("");

      const railHtml = letters.map((letter) => `
        <button type="button" onclick="jumpToSpeciesLetter('${letter}')">${letter}</button>
      `).join("");

      speciesDirectory.innerHTML = `
        <div class="species-directory">${directoryHtml}</div>
        <div class="letter-rail">${railHtml}</div>
      `;
    }

    function selectSpecies(speciesId) {
      if (!speciesData[speciesId]?.enabled) return;
      currentSpecies = speciesId;
      speciesSelect.value = speciesId;
      recordSpeciesSelect.value = speciesId;
      renderSpeciesDirectory();
      recalculateAndRender();
    }

    function jumpToSpeciesLetter(letter) {
      const target = document.getElementById(`species-letter-${letter}`);
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function ensureBmobSdkLoaded() {
      if (window.Bmob) {
        return true;
      }

      for (const sdkUrl of BMOB_SDK_URLS) {
        try {
          bmobStatus.textContent = "正在加载 Bmob";
          bmobStatus.classList.add("warn");
          setArchiveMessage(`正在尝试加载 Bmob SDK：${sdkUrl}`, false);
          await loadExternalScript(sdkUrl);

          if (window.Bmob) {
            setArchiveMessage(`Bmob SDK 加载成功：${sdkUrl}`, false);
            return true;
          }
        } catch (error) {
          console.warn(error);
        }
      }

      return false;
    }

    async function initBmob() {
      // 优先走 REST 模式：只要 Application ID 和 REST API Key 已配置就直接用
      if (!BMOB_APPLICATION_ID.includes("YOUR_") &&
          !BMOB_REST_API_KEY.includes("YOUR_") &&
          !BMOB_API_SAFE_CODE.includes("YOUR_")) {
        bmobReady = true;
        bmobMode = "rest";
        bmobStatus.textContent = "Bmob REST 已连接";
        bmobStatus.classList.remove("warn");
        setArchiveMessage("已使用 Application ID + REST API Key + Safe Code 连接 Bmob REST API。", false);
        return true;
      }

      // 旧逻辑兜底：尝试加载 SDK
      const sdkLoaded = await ensureBmobSdkLoaded();

      if (!sdkLoaded) {
        bmobStatus.textContent = "Bmob 加载失败";
        bmobStatus.classList.add("warn");
        setArchiveMessage("Bmob SDK 加载失败：请检查网络，或手动下载 Bmob-2.2.5.min.js 后改成本地引用。", true);
        return false;
      }

      if (BMOB_SECRET_KEY.includes("YOUR_") || BMOB_API_SAFE_CODE.includes("YOUR_")) {
        bmobStatus.textContent = "Bmob 待配置";
        bmobStatus.classList.add("warn");
        setArchiveMessage("请先把代码顶部的 YOUR_SECRET_KEY 和 YOUR_API_SAFE_CODE 替换为你的 Bmob 配置。", false);
        return false;
      }

      try {
        Bmob.initialize(BMOB_SECRET_KEY, BMOB_API_SAFE_CODE);
        bmobReady = true;
        bmobMode = "sdk";
        bmobStatus.textContent = "Bmob 已连接";
        bmobStatus.classList.remove("warn");
        setArchiveMessage("Bmob 已初始化，正在读取云端档案。", false);
        return true;
      } catch (error) {
        bmobStatus.textContent = "Bmob 初始化失败";
        bmobStatus.classList.add("warn");
        setArchiveMessage(`Bmob 初始化失败：${error.message || error}`, true);
        return false;
      }
    }

    function setArchiveMessage(message, isError) {
      archiveMessage.textContent = message;
      archiveMessage.classList.toggle("error-message", Boolean(isError));
    }

    function formatBmobError(error) {
      if (!error) {
        return "未知错误";
      }

      // 网络层错误：fetch 抛出 TypeError（Failed to fetch / NetworkError）
      if (error instanceof TypeError) {
        const msg = error.message || "";
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          return "网络连接失败：无法连接到 Bmob 服务器。请检查网络是否正常，或稍后重试。";
        }
        if (msg.includes("CORS")) {
          return "跨域请求被拦截（CORS）。请在 Bmob 后台「设置 → 安全设置」中添加当前网站域名。";
        }
        return `网络错误：${msg}`;
      }

      if (typeof error === "string") {
        // 常见网络错误字符串
        if (error.includes("Failed to fetch")) {
          return "网络连接失败：无法连接到 Bmob 服务器。请检查网络是否正常。";
        }
        return error;
      }

      const parts = [];
      if (error.code !== undefined) {
        parts.push(`code=${error.code}`);
      }
      if (error.error) {
        parts.push(error.error);
      }
      if (error.name === "AbortError") {
        parts.push("请求超时，浏览器已自动中断。");
      }
      if (error.message) {
        parts.push(error.message);
      }
      if (error.status) {
        parts.push(`status=${error.status}`);
      }

      if (parts.length > 0) {
        const message = parts.join("；");
        if (message.includes("签名安全验证错误")) {
          return `${message}。请注意：Bmob JS SDK 初始化的第二个参数需要填写"API安全码"，不是 REST API Key。`;
        }
        return message;
      }

      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }

    function todayDateString() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function readField(record, fieldName) {
      if (record && typeof record.get === "function") {
        return record.get(fieldName);
      }
      return record ? record[fieldName] : undefined;
    }

    function getObjectId(record) {
      return record.objectId || record.id || readField(record, "objectId");
    }

    function getPendingKey(objectId, type) {
      return `${objectId}:${type}`;
    }

    function setPendingFiles(objectId, type, files, limit = 2) {
      const key = getPendingKey(objectId, type);
      pendingPhotoFiles[key] = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, limit);
      const hint = document.querySelector(`[data-pending-hint="${key}"]`);
      if (hint) {
        hint.textContent = pendingPhotoFiles[key].length > 0
          ? `已选择 ${pendingPhotoFiles[key].length} 张照片`
          : "尚未选择照片";
      }
    }

    function getPendingFiles(objectId, type) {
      return pendingPhotoFiles[getPendingKey(objectId, type)] || [];
    }

    function clearPendingFiles(objectId, type) {
      setPendingFiles(objectId, type, [], 2);
    }

    function handlePastePhotos(event, objectId, type, limit = 2) {
      const files = Array.from(event.clipboardData?.files || []);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        return;
      }

      event.preventDefault();
      setPendingFiles(objectId, type, imageFiles, limit);
      setArchiveMessage(`已从剪贴板读取 ${Math.min(imageFiles.length, limit)} 张照片。`, false);
    }

    function readFileAsImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function canvasToBlob(canvas, type, quality) {
      return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    }

    async function compressImageToUnder2MB(file) {
      const maxBytes = 2 * 1024 * 1024;
      if (file.size <= maxBytes && file.type === "image/jpeg") {
        return file;
      }

      const image = await readFileAsImage(file);
      const canvas = document.createElement("canvas");
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      let quality = 0.86;
      let blob = await canvasToBlob(canvas, "image/jpeg", quality);
      while (blob && blob.size > maxBytes && quality > 0.42) {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }

      if (!blob) {
        throw new Error("图片压缩失败，请换一张照片。");
      }

      return new File([blob], `${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
        type: "image/jpeg"
      });
    }

    function normalizeBmobFileResult(result, fileName) {
      const first = Array.isArray(result) ? result[0] : result;
      const url =
        (typeof first?.url === "function" ? first.url() : "") ||
        (typeof first?.get === "function" ? first.get("url") : "") ||
        first?.url ||
        first?.cdn ||
        first?.path ||
        first?.filename;

      if (!url) {
        throw new Error("Bmob 文件已返回，但没有拿到图片 URL。");
      }

      return {
        url,
        name: first?.filename || first?.name || fileName,
        size: first?.size || 0,
        uploadedAt: todayDateString()
      };
    }

    function withTimeout(promise, timeoutMs, message) {
      let timerId;
      const timeoutPromise = new Promise((_, reject) => {
        timerId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      });

      return Promise.race([promise, timeoutPromise]).finally(() => {
        window.clearTimeout(timerId);
      });
    }

    function makeSafeUploadFileName(prefix, file) {
      const extensionFromName = String(file.name || "").split(".").pop()?.toLowerCase();
      const extension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extensionFromName)
        ? extensionFromName
        : (file.type === "image/png" ? "png" : "jpg");
      const cleanPrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
      return `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    }

    let localPhotoDbPromise = null;

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function openLocalPhotoDb() {
      if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("当前浏览器环境不支持 IndexedDB。"));
      }

      if (localPhotoDbPromise) {
        return localPhotoDbPromise;
      }

      localPhotoDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("TurtleCareLocalPhotos", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("photos")) {
            db.createObjectStore("photos", { keyPath: "key" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return localPhotoDbPromise;
    }

    async function saveLocalPhoto(file, fileName, errors) {
      if (typeof indexedDB === "undefined") {
        return saveLocalPhotoToLocalStorage(file, fileName, errors);
      }

      const db = await openLocalPhotoDb();
      const key = `local-photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      await new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readwrite");
        tx.objectStore("photos").put({
          key,
          name: fileName,
          type: file.type,
          size: file.size,
          blob: file,
          createdAt: new Date().toISOString(),
          cloudErrors: errors
        });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      return {
        url: "",
        localKey: key,
        name: fileName,
        size: file.size,
        storage: "local-indexeddb",
        uploadedAt: todayDateString()
      };
    }

    async function saveLocalPhotoToLocalStorage(file, fileName, errors) {
      const maxLocalBytes = 2 * 1024 * 1024;
      if (file.size > maxLocalBytes) {
        throw new Error(`云端文件服务不可用，且当前浏览器没有 IndexedDB；原图 ${Math.round(file.size / 1024)}KB 超过 localStorage 兜底上限 2048KB。${errors.join("；")}`);
      }

      const key = `local-storage-photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const dataUrl = await fileToDataUrl(file);
      localStorage.setItem(key, dataUrl);
      localStorage.setItem(`${key}:meta`, JSON.stringify({
        name: fileName,
        type: file.type,
        size: file.size,
        createdAt: new Date().toISOString(),
        cloudErrors: errors
      }));

      return {
        url: "",
        localKey: key,
        name: fileName,
        size: file.size,
        storage: "local-storage",
        uploadedAt: todayDateString()
      };
    }

    async function getLocalPhotoObjectUrl(localKey) {
      if (localKey?.startsWith("local-storage-photo-")) {
        return localStorage.getItem(localKey) || "";
      }

      const db = await openLocalPhotoDb();
      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction("photos", "readonly");
        const request = tx.objectStore("photos").get(localKey);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!record?.blob) {
        return "";
      }

      return URL.createObjectURL(record.blob);
    }

    async function hydrateLocalPhotoElements() {
      const elements = Array.from(document.querySelectorAll("img[data-local-photo-key]"));
      for (const element of elements) {
        if (element.dataset.localLoaded === "true") continue;
        const objectUrl = await getLocalPhotoObjectUrl(element.dataset.localPhotoKey).catch(() => "");
        if (objectUrl) {
          element.src = objectUrl;
          element.dataset.localLoaded = "true";
        }
      }
    }

    async function uploadPhotoFileBySdk(file, fileName) {
      if (typeof Bmob === "undefined" || typeof Bmob.File !== "function") {
        throw new Error("当前 Bmob SDK 不支持文件上传。");
      }

      const bmobFile = Bmob.File(fileName, file);
      const result = await withTimeout(
        bmobFile.save(),
        15000,
        "Bmob SDK 文件上传超过 15 秒未响应。"
      );
      return normalizeBmobFileResult(result, fileName);
    }

    async function uploadPhotoFile(file, prefix) {
      const fileName = makeSafeUploadFileName(prefix, file);
      const uploadFile = new File([file], fileName, {
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now()
      });
      const errors = [];

      if (!BMOB_APPLICATION_ID.includes("YOUR_") && !BMOB_REST_API_KEY.includes("YOUR_")) {
        try {
          return await bmobRestUploadFile(uploadFile);
        } catch (error) {
          console.warn("Bmob REST file upload failed, trying SDK fallback.", error);
          errors.push(`REST：${formatBmobError(error)}`);
        }
      }

      try {
        return await uploadPhotoFileBySdk(uploadFile, fileName);
      } catch (error) {
        errors.push(`SDK：${formatBmobError(error)}`);
      }

      try {
        return await saveLocalPhoto(uploadFile, fileName, errors);
      } catch (error) {
        throw new Error(`照片保存失败。云端文件服务不可用，本机 IndexedDB 兜底也失败：${formatBmobError(error)}。`);
      }
    }

    async function uploadPhotoFiles(files, prefix, limit = 2) {
      const selectedFiles = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, limit);
      const uploaded = [];

      for (const file of selectedFiles) {
        uploaded.push(await uploadPhotoFile(file, prefix));
      }

      return uploaded;
    }

    async function bmobRestRequest(path, options = {}) {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), 15000);

      try {
        // 代理模式下认证头由 server.js / Vercel Function 自动注入
        const response = await fetch(`${BMOB_API_BASE}${path}`, {
          method: options.method || "GET",
          headers: { "Content-Type": "application/json" },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.code) {
          throw data;
        }

        return data;
      } finally {
        clearTimeout(timerId);
      }
    }

    async function bmobRestUploadFile(file) {
      const safeName = encodeURIComponent(file.name.replace(/\s+/g, "-"));
      const controller = new AbortController();
      const timerId = window.setTimeout(() => controller.abort(), 45000);

      // 统一走代理模式（本地 server.js 或 Vercel Serverless Function）
      const uploadBase = "/api/bmob/2/files";
      const response = await fetch(`${uploadBase}/${safeName}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
        signal: controller.signal
      }).finally(() => window.clearTimeout(timerId));

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.code) {
        throw data;
      }

      return {
        url: data.url,
        name: data.filename || file.name,
        size: file.size,
        uploadedAt: todayDateString()
      };
    }

    async function createTurtleRecord(payload) {
      // 注入当前用户 owner 指针，实现数据隔离
      const enrichedPayload = { ...payload };

      if (bmobMode === "sdk") {
        const currentUser = typeof Bmob !== "undefined" && Bmob.User && Bmob.User.current ? Bmob.User.current() : null;
        const query = Bmob.Query("TurtleRecord");
        Object.entries(enrichedPayload).forEach(([key, value]) => query.set(key, value));
        if (currentUser) {
          query.set("owner", Bmob.Pointer("_User", currentUser.id || currentUser.objectId));
        }
        return query.save();
      }

      if (bmobMode === "rest") {
        // REST 模式：从 localStorage 读取当前用户 ID，写入 owner Pointer
        const sessionToken = localStorage.getItem("bmob_session_token");
        const userId        = localStorage.getItem("bmob_user_id");
        if (userId) {
          enrichedPayload.owner = {
            "__type": "Pointer",
            "className": "_User",
            "objectId": userId
          };
        }
        return bmobRestRequestWithSession("/classes/TurtleRecord", {
          method: "POST",
          body: enrichedPayload,
          sessionToken
        });
      }

      // fallback：无鉴权（不应走到这里）
      return bmobRestRequest("/classes/TurtleRecord", {
        method: "POST",
        body: enrichedPayload
      });
    }

    async function getTurtleRecord(objectId) {
      if (bmobMode === "sdk") {
        const query = Bmob.Query("TurtleRecord");
        return query.get(objectId);
      }

      return bmobRestRequest(`/classes/TurtleRecord/${objectId}`);
    }

    async function updateTurtleRecord(objectId, payload) {
      if (bmobMode === "sdk") {
        const turtle = await getTurtleRecord(objectId);
        Object.entries(payload).forEach(([key, value]) => turtle.set(key, value));
        return turtle.save();
      }

      return bmobRestRequest(`/classes/TurtleRecord/${objectId}`, {
        method: "PUT",
        body: payload
      });
    }

    async function findTurtleRecords() {
      if (bmobMode === "sdk") {
        const currentUser = typeof Bmob !== "undefined" && Bmob.User && Bmob.User.current ? Bmob.User.current() : null;
        const query = Bmob.Query("TurtleRecord");
        if (currentUser) {
          query.equalTo("owner", Bmob.Pointer("_User", currentUser.id || currentUser.objectId));
        }
        return query.find();
      }

      if (bmobMode === "rest") {
        const sessionToken = localStorage.getItem("bmob_session_token");
        const userId        = localStorage.getItem("bmob_user_id");
        const where = userId
          ? encodeURIComponent(JSON.stringify({
              owner: { "__type": "Pointer", "className": "_User", "objectId": userId }
            }))
          : null;
        const url = where ? `/classes/TurtleRecord?where=${where}` : "/classes/TurtleRecord";
        const data = await bmobRestRequestWithSession(url, { sessionToken });
        return data.results || [];
      }

      const data = await bmobRestRequest("/classes/TurtleRecord");
      return data.results || [];
    }

    async function saveNewTurtle() {
      if (!bmobReady) {
        setArchiveMessage("Bmob 尚未配置，暂时不能保存云端档案。", true);
        return;
      }

      const nickname = nicknameInput.value.trim();
      const species = recordSpeciesSelect.value;
      const birthYear = Number(birthYearInput.value);
      const lifeStage = lifeStageSelect.value;
      const isMature = isMatureInput.checked;

      if (!nickname) {
        setArchiveMessage("请先填写乌龟昵称。", true);
        return;
      }

      if (!Number.isInteger(birthYear) || birthYear < 1980 || birthYear > 2100) {
        setArchiveMessage("请填写合理的出生年份。", true);
        return;
      }

      createTurtleButton.disabled = true;

      try {
        await createTurtleRecord({
          nickname,
          species,
          birthYear,
          isMature,
          lifeStage,
          hasLaidEggs: false,
          eggLogs: [],
          avatarUrl: "",
          weightLogs: [],
          historyLogs: []
        });

        nicknameInput.value = "";
        birthYearInput.value = "";
        lifeStageSelect.value = "hatchling";
        isMatureInput.checked = false;

        setArchiveMessage("新档案已保存到 TurtleRecord。", false);
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`保存失败：${formatBmobError(error)}`, true);
      } finally {
        createTurtleButton.disabled = false;
      }
    }

    async function addWeight(objectId) {
      if (!bmobReady) {
        setArchiveMessage("Bmob 尚未配置，暂时不能记录体重。", true);
        return;
      }

      const input = document.querySelector(`[data-weight-input="${objectId}"]`);
      const weight = Number(input.value);

      if (!Number.isFinite(weight) || weight <= 0) {
        setArchiveMessage("请填写有效的体重克数。", true);
        return;
      }

      try {
        const turtle = await getTurtleRecord(objectId);
        const currentLogs = readField(turtle, "weightLogs") || [];
        const nextLogs = [
          ...currentLogs,
          { date: todayDateString(), weight }
        ];

        await updateTurtleRecord(objectId, { weightLogs: nextLogs });

        input.value = "";
        setArchiveMessage("今日体重已记录。", false);
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`体重保存失败：${formatBmobError(error)}`, true);
      }
    }

    async function setAvatarFromInput(objectId) {
      if (!bmobReady) {
        setArchiveMessage("Bmob 尚未配置，暂时不能上传头像。", true);
        return;
      }

      const fileInput = document.querySelector(`[data-avatar-input="${objectId}"]`);
      const files = fileInput?.files?.length ? fileInput.files : getPendingFiles(objectId, "avatar");

      if (!files || files.length === 0) {
        setArchiveMessage("请先选择或粘贴一张头像照片。", true);
        return;
      }

      try {
        setArchiveMessage("正在直接上传头像原图...", false);
        const [photo] = await uploadPhotoFiles(files, `avatar-${objectId}`, 1);
        await updateTurtleRecord(objectId, {
          avatarUrl: photo.url,
          avatarPhoto: photo
        });
        clearPendingFiles(objectId, "avatar");
        if (fileInput) fileInput.value = "";
        setArchiveMessage(
          photo.storage === "local-indexeddb" || photo.storage === "local-storage"
            ? "Bmob 文件服务暂不可用，头像已保存到本机浏览器并已绑定到档案。"
            : "头像已更新。",
          false
        );
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`头像上传失败：${formatBmobError(error)}`, true);
      }
    }

    async function addHistoryLog(objectId) {
      if (!bmobReady) {
        setArchiveMessage("Bmob 尚未配置，暂时不能保存历史记录。", true);
        return;
      }

      const weightInput = document.querySelector(`[data-history-weight="${objectId}"]`);
      const lengthInput = document.querySelector(`[data-history-length="${objectId}"]`);
      const fileInput = document.querySelector(`[data-history-files="${objectId}"]`);
      const weight = Number(weightInput?.value);
      const carapaceLength = Number(lengthInput?.value);
      const files = fileInput?.files?.length ? fileInput.files : getPendingFiles(objectId, "history");

      if (!Number.isFinite(weight) || weight <= 0) {
        setArchiveMessage("请填写有效的体重克数。", true);
        return;
      }

      if (!Number.isFinite(carapaceLength) || carapaceLength <= 0) {
        setArchiveMessage("请填写有效的背甲长度。", true);
        return;
      }

      try {
        setArchiveMessage("正在直接上传照片并保存历史记录...", false);
        const turtle = await getTurtleRecord(objectId);
        const historyLogs = readField(turtle, "historyLogs") || [];
        const weightLogs = readField(turtle, "weightLogs") || [];
        const photos = files && files.length > 0
          ? await uploadPhotoFiles(files, `history-${objectId}`, 2)
          : [];
        const now = new Date();
        const log = {
          id: `${Date.now()}`,
          date: todayDateString(),
          createdAtText: now.toLocaleString("zh-CN"),
          weight,
          carapaceLength,
          photos
        };

        await updateTurtleRecord(objectId, {
          historyLogs: [...historyLogs, log],
          weightLogs: [...weightLogs, { date: log.date, weight }]
        });

        weightInput.value = "";
        lengthInput.value = "";
        if (fileInput) fileInput.value = "";
        clearPendingFiles(objectId, "history");
        setArchiveMessage(
          photos.some((photo) => photo.storage === "local-indexeddb" || photo.storage === "local-storage")
            ? "历史记录已保存；照片因云端文件服务不可用，暂存到本机浏览器。"
            : "历史记录已保存。",
          false
        );
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`历史记录保存失败：${formatBmobError(error)}`, true);
      }
    }

    async function deleteHistoryLog(objectId, logId) {
      try {
        const turtle = await getTurtleRecord(objectId);
        const historyLogs = readField(turtle, "historyLogs") || [];
        await updateTurtleRecord(objectId, {
          historyLogs: historyLogs.filter((log) => log.id !== logId)
        });
        setArchiveMessage("历史记录已删除。", false);
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`删除失败：${formatBmobError(error)}`, true);
      }
    }

    async function setAvatarFromHistoryPhoto(objectId, logId, photoIndex) {
      try {
        const turtle = await getTurtleRecord(objectId);
        const historyLogs = readField(turtle, "historyLogs") || [];
        const log = historyLogs.find((item) => item.id === logId);
        const photo = log?.photos?.[photoIndex];
        if (!photo) {
          setArchiveMessage("没有找到这张照片。", true);
          return;
        }

        await updateTurtleRecord(objectId, {
          avatarUrl: photo.url || "",
          avatarPhoto: photo
        });
        setArchiveMessage("已将该照片设为头像。", false);
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`设置头像失败：${formatBmobError(error)}`, true);
      }
    }

    async function replaceHistoryPhotos(objectId, logId) {
      const fileInput = document.querySelector(`[data-replace-files="${objectId}-${logId}"]`);
      const files = fileInput?.files || [];

      if (files.length === 0) {
        setArchiveMessage("请先选择要替换的照片，最多 2 张。", true);
        return;
      }

      try {
        setArchiveMessage("正在替换照片...", false);
        const turtle = await getTurtleRecord(objectId);
        const historyLogs = readField(turtle, "historyLogs") || [];
        const photos = await uploadPhotoFiles(files, `replace-${objectId}-${logId}`, 2);
        const nextLogs = historyLogs.map((log) => log.id === logId ? { ...log, photos } : log);
        await updateTurtleRecord(objectId, { historyLogs: nextLogs });
        fileInput.value = "";
        setArchiveMessage(
          photos.some((photo) => photo.storage === "local-indexeddb" || photo.storage === "local-storage")
            ? "照片已替换；新照片暂存到本机浏览器。"
            : "照片已替换。",
          false
        );
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`替换失败：${formatBmobError(error)}`, true);
      }
    }

    async function addEggLog(objectId) {
      const dateInput = document.querySelector(`[data-egg-date="${objectId}"]`);
      const countInput = document.querySelector(`[data-egg-count="${objectId}"]`);
      const date = dateInput?.value;
      const count = Number(countInput?.value);

      if (!date) {
        setArchiveMessage("请先选择产蛋日期。", true);
        return;
      }

      if (!Number.isInteger(count) || count <= 0) {
        setArchiveMessage("请填写有效的产蛋数量。", true);
        return;
      }

      try {
        const turtle = await getTurtleRecord(objectId);
        const eggLogs = readField(turtle, "eggLogs") || [];
        await updateTurtleRecord(objectId, {
          hasLaidEggs: true,
          eggLogs: [
            ...eggLogs,
            { id: `${Date.now()}`, date, count }
          ]
        });

        dateInput.value = "";
        countInput.value = "";
        setArchiveMessage("产蛋记录已保存。", false);
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`产蛋记录保存失败：${formatBmobError(error)}`, true);
      }
    }

    async function deleteEggLog(objectId, eggId) {
      try {
        const turtle = await getTurtleRecord(objectId);
        const eggLogs = readField(turtle, "eggLogs") || [];
        const nextLogs = eggLogs.filter((log) => log.id !== eggId);
        await updateTurtleRecord(objectId, {
          hasLaidEggs: nextLogs.length > 0,
          eggLogs: nextLogs
        });
        setArchiveMessage("产蛋记录已删除。", false);
        await fetchTurtles();
      } catch (error) {
        setArchiveMessage(`删除产蛋记录失败：${formatBmobError(error)}`, true);
      }
    }

    async function fetchTurtles() {
      if (!bmobReady) {
        turtleList.innerHTML = `<div class="archive-message">Bmob 未配置，暂时无法读取云端档案。</div>`;
        return;
      }

      turtleList.innerHTML = `<div class="archive-message">正在从 TurtleRecord 读取档案...</div>`;

      try {
        turtleRecords = await findTurtleRecords();
        syncCurrentSpeciesFromRecords();
        renderTurtleList();
        recalculateAndRender();
        setArchiveMessage(`已读取 ${turtleRecords.length} 个档案。`, false);
      } catch (error) {
        if (error && error.code === 101 && String(error.error || error.message || "").includes("TurtleRecord")) {
          turtleRecords = [];
          renderTurtleList();
          setArchiveMessage("云端还没有 TurtleRecord 表。新建第一只乌龟档案后，Bmob 会自动创建这张表。", false);
          return;
        }

        turtleList.innerHTML = `<div class="archive-message error-message">读取失败：${formatBmobError(error)}</div>`;
      }
    }

    function renderTurtleList() {
      if (turtleRecords.length === 0) {
        turtleList.innerHTML = `<div class="archive-message">还没有乌龟档案，先新建一个吧。</div>`;
        return;
      }

      const grouped = turtleRecords.reduce((result, record) => {
        const speciesInfo = getSpeciesInfo(readField(record, "species"));
        const speciesKey = speciesInfo.id;
        const stageKey = readField(record, "lifeStage") || (readField(record, "isMature") ? "mature" : "hatchling");

        if (!result[speciesKey]) {
          result[speciesKey] = {
            species: speciesInfo,
            stages: {}
          };
        }
        if (!result[speciesKey].stages[stageKey]) {
          result[speciesKey].stages[stageKey] = [];
        }
        result[speciesKey].stages[stageKey].push(record);
        return result;
      }, {});

      const stageOrder = ["hatchling", "subadult", "mature", "breeder"];

      turtleList.innerHTML = Object.values(grouped).map((speciesGroup) => `
        <section class="species-section">
          <h3 class="species-section-title">${speciesGroup.species.name} <span class="species-latin">${speciesGroup.species.scientificName}</span></h3>
          ${stageOrder.map((stageKey) => {
            const records = speciesGroup.stages[stageKey] || [];
            if (records.length === 0) return "";
            return `
              <section class="stage-section">
                <h4 class="stage-section-title">${lifeStageData[stageKey] || "未分阶段"} · ${records.length} 只</h4>
                ${records.map((record) => renderTurtleRecordCard(record)).join("")}
              </section>
            `;
          }).join("")}
        </section>
      `).join("");

      hydrateLocalPhotoElements();
    }

    function renderPhotoImage(photo, className, altText) {
      if (photo?.url) {
        return `<img class="${className}" src="${photo.url}" alt="${altText}" />`;
      }

      if (photo?.localKey) {
        return `<img class="${className}" src="" data-local-photo-key="${photo.localKey}" alt="${altText}" />`;
      }

      return "";
    }

    function renderTurtleRecordCard(record) {
        const objectId = getObjectId(record);
        const nickname = readField(record, "nickname") || "未命名";
        const speciesInfo = getSpeciesInfo(readField(record, "species"));
        const birthYear = readField(record, "birthYear") || "-";
        const stageKey = readField(record, "lifeStage") || (readField(record, "isMature") ? "mature" : "hatchling");
        const stageName = lifeStageData[stageKey] || "未分阶段";
        const isReproductiveStage = stageKey === "mature" || stageKey === "breeder";
        const weightLogs = readField(record, "weightLogs") || [];
        const historyLogs = readField(record, "historyLogs") || [];
        const eggLogs = readField(record, "eggLogs") || [];
        const avatarUrl = readField(record, "avatarUrl") || "";
        const avatarPhoto = readField(record, "avatarPhoto") || null;
        const latestWeight = weightLogs.length > 0 ? `${weightLogs[weightLogs.length - 1].weight}g` : "暂无";
        const latestLength = historyLogs.length > 0 ? `${historyLogs[historyLogs.length - 1].carapaceLength}cm` : "暂无";
        const chartHtml = renderWeightChart(historyLogs);
        const historyHtml = renderHistoryLogs(objectId, historyLogs);
        const eggHtml = renderEggTools(objectId, eggLogs, isReproductiveStage);
        const avatarImage = renderPhotoImage({ ...avatarPhoto, url: avatarUrl || avatarPhoto?.url }, "turtle-avatar", `${nickname}头像`);
        const avatarHtml = avatarImage
          ? avatarImage
          : `<div class="turtle-avatar avatar-placeholder">${nickname.slice(0, 1)}</div>`;

        return `
          <article class="turtle-record-card" data-record-card="${objectId}">
            <button class="record-button" type="button" onclick="toggleTurtleDetail('${objectId}')">
              <div class="card-header">
                <div class="record-top">
                  ${avatarHtml}
                  <div>
                    <h4 class="record-name">${nickname}</h4>
                    <p class="record-note">${speciesInfo.name} · ${stageName} · ${birthYear}年 · 最近体重 ${latestWeight} · 背甲 ${latestLength}</p>
                  </div>
                </div>
                <span class="status-pill">${stageName}</span>
              </div>
            </button>

            <div class="record-detail">
              <div class="record-meta-grid">
                <div class="meta-item">
                  <div class="label">出生年份</div>
                  <div class="value">${birthYear}</div>
                </div>
                <div class="meta-item">
                  <div class="label">品种</div>
                  <div class="value">${speciesInfo.name}</div>
                  <div class="species-latin">${speciesInfo.scientificName}</div>
                </div>
                <div class="meta-item">
                  <div class="label">生长阶段</div>
                  <div class="value">${stageName}</div>
                </div>
              </div>

              <div class="photo-tools">
                <h3 class="trend-title">头像照片</h3>
                <input data-avatar-input="${objectId}" type="file" accept="image/*" onchange="setPendingFiles('${objectId}', 'avatar', this.files, 1)" />
                <div class="paste-zone" tabindex="0" onpaste="handlePastePhotos(event, '${objectId}', 'avatar', 1)">
                  点击这里后按 Ctrl+V，可粘贴一张照片作为头像。
                </div>
                <button class="secondary-button" type="button" onclick="setAvatarFromInput('${objectId}')">上传并设为头像</button>
              </div>

              <div class="weight-form">
                <div class="form-field">
                  <label for="weight-${objectId}">今日体重(g)</label>
                  <input id="weight-${objectId}" data-history-weight="${objectId}" type="number" min="1" placeholder="例如：68" />
                </div>
                <div class="form-field">
                  <label for="length-${objectId}">背甲长度(cm)</label>
                  <input id="length-${objectId}" data-history-length="${objectId}" type="number" min="0.1" step="0.1" placeholder="例如：12.6" />
                </div>
              </div>

              <div class="history-tools">
                <input data-history-files="${objectId}" type="file" accept="image/*" multiple onchange="setPendingFiles('${objectId}', 'history', this.files, 2)" />
                <div class="paste-zone" tabindex="0" onpaste="handlePastePhotos(event, '${objectId}', 'history', 2)">
                  点击这里后按 Ctrl+V，可粘贴本次记录照片，单次最多 2 张。
                </div>
                <button type="button" onclick="addHistoryLog('${objectId}')">保存本次成长记录</button>
                <button class="secondary-button" type="button" onclick="toggleHistoryPanel('${objectId}')">历史记录</button>
              </div>

              ${eggHtml}

              <div class="history-panel">
                <h3 class="trend-title">体重历史曲线</h3>
                ${chartHtml}
                <div class="history-list">${historyHtml}</div>
              </div>
            </div>
          </article>
        `;
    }

    function renderEggTools(objectId, eggLogs, isReproductiveStage) {
      if (!isReproductiveStage) {
        return `<div class="archive-message">产蛋管理会在“成熟个体”或“稳产种龟”阶段显示。</div>`;
      }

      const eggHistory = eggLogs.length
        ? eggLogs
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((log) => `
              <div class="history-item">
                <div class="history-meta">
                  <strong>${log.date}</strong>
                  <span>数量：${log.count} 枚</span>
                </div>
                <div class="tiny-actions">
                  <button class="danger-button" type="button" onclick="deleteEggLog('${objectId}', '${log.id}')">删除</button>
                </div>
              </div>
            `).join("")
        : `<div class="archive-message">还没有产蛋记录。</div>`;

      return `
        <div class="history-tools">
          <h3 class="trend-title">产蛋记录</h3>
          <div class="egg-tools">
            <div class="form-field">
              <label for="egg-date-${objectId}">产蛋日期</label>
              <input id="egg-date-${objectId}" data-egg-date="${objectId}" type="date" />
            </div>
            <div class="form-field">
              <label for="egg-count-${objectId}">产蛋数量</label>
              <input id="egg-count-${objectId}" data-egg-count="${objectId}" type="number" min="1" placeholder="例如：3" />
            </div>
            <button type="button" onclick="addEggLog('${objectId}')">记录产蛋</button>
          </div>
          <div class="history-list">${eggHistory}</div>
        </div>
      `;
    }

    function renderWeightChart(historyLogs) {
      const logs = historyLogs.filter((log) => Number.isFinite(Number(log.weight)));
      if (logs.length === 0) {
        return `<div class="archive-message">暂无体重曲线数据。</div>`;
      }

      const width = 320;
      const height = 120;
      const padding = 18;
      const weights = logs.map((log) => Number(log.weight));
      const minWeight = Math.min(...weights);
      const maxWeight = Math.max(...weights);
      const range = Math.max(1, maxWeight - minWeight);
      const points = logs.map((log, index) => {
        const x = padding + (logs.length === 1 ? 0 : index * ((width - padding * 2) / (logs.length - 1)));
        const y = height - padding - ((Number(log.weight) - minWeight) / range) * (height - padding * 2);
        return `${x},${y}`;
      }).join(" ");

      return `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="120" role="img" aria-label="体重历史曲线">
          <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#f7faf8"></rect>
          <polyline points="${points}" fill="none" stroke="#167a4a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
          ${logs.map((log, index) => {
            const [x, y] = points.split(" ")[index].split(",");
            return `<circle cx="${x}" cy="${y}" r="4" fill="#167a4a"></circle>`;
          }).join("")}
          <text x="${padding}" y="${height - 5}" fill="#6e6e73" font-size="11">${minWeight}g</text>
          <text x="${width - padding - 42}" y="16" fill="#6e6e73" font-size="11">${maxWeight}g</text>
        </svg>
      `;
    }

    function renderHistoryLogs(objectId, historyLogs) {
      if (historyLogs.length === 0) {
        return `<div class="archive-message">暂无历史记录。</div>`;
      }

      return historyLogs.slice().reverse().map((log) => {
        const photos = log.photos || [];
        const photoHtml = photos.length > 0
          ? `<div class="photo-grid">${photos.map((photo, index) => `
              <div>
                ${renderPhotoImage(photo, "photo-thumb", "成长记录照片")}
                <div class="tiny-actions">
                  <button class="secondary-button" type="button" onclick="setAvatarFromHistoryPhoto('${objectId}', '${log.id}', ${index})">设为头像</button>
                </div>
              </div>
            `).join("")}</div>`
          : `<div class="archive-message">本次没有照片。</div>`;

        return `
          <article class="history-item">
            <div class="history-meta">
              <strong>${log.createdAtText || log.date}</strong>
              <span>体重：${log.weight}g</span>
              <span>背甲：${log.carapaceLength}cm</span>
            </div>
            ${photoHtml}
            <div class="tiny-actions">
              <input data-replace-files="${objectId}-${log.id}" type="file" accept="image/*" multiple />
              <button class="secondary-button" type="button" onclick="replaceHistoryPhotos('${objectId}', '${log.id}')">替换照片</button>
              <button class="danger-button" type="button" onclick="deleteHistoryLog('${objectId}', '${log.id}')">删除记录</button>
            </div>
          </article>
        `;
      }).join("");
    }

    function toggleTurtleDetail(objectId) {
      const card = document.querySelector(`[data-record-card="${objectId}"]`);
      if (card) {
        card.classList.toggle("expanded");
      }
    }

    function toggleHistoryPanel(objectId) {
      const card = document.querySelector(`[data-record-card="${objectId}"]`);
      if (card) {
        card.classList.toggle("show-history");
      }
    }

    function buildQWeatherUrl(path) {
      const apiHost = QWEATHER_API_HOST.trim();
      return `https://${apiHost}${path}?location=${currentLocation.id}&key=${QWEATHER_API_KEY}`;
    }

    // ==========================================================================
    // 城市搜索与 GPS 定位模块
    // ==========================================================================

    // 防抖计时器
    let citySearchTimer = null;

    // 更新当前位置标签
    function updateLocationLabel() {
      if (currentLocationLabel) {
        const adm1 = currentLocation.adm1 || "";
        const adm2 = currentLocation.adm2 || "";
        const fullName = adm1 && adm2 && adm1 !== adm2
          ? `${adm1} ${adm2} ${currentLocation.name}`
          : `${currentLocation.name}`;
        currentLocationLabel.textContent = `当前位置：${fullName}`;
      }
    }

    // 调用和风 GeoAPI 搜索城市
    async function searchCities(keyword) {
      if (!keyword || keyword.trim().length < 1) return [];

      const apiHost = QWEATHER_API_HOST.trim();
      const url = `https://${apiHost}/geo/v2/city/lookup?location=${encodeURIComponent(keyword.trim())}&range=cn&number=10&key=${QWEATHER_API_KEY}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === "200" && Array.isArray(data.location)) {
          return data.location;
        }
        return [];
      } catch (err) {
        console.error("城市搜索失败:", err);
        return [];
      }
    }

    // 通过经纬度反查城市
    async function reverseGeocode(lat, lon) {
      const apiHost = QWEATHER_API_HOST.trim();
      const url = `https://${apiHost}/geo/v2/city/lookup?location=${lon},${lat}&range=cn&key=${QWEATHER_API_KEY}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === "200" && data.location && data.location.length > 0) {
          return data.location[0];
        }
        return null;
      } catch (err) {
        console.error("反查城市失败:", err);
        return null;
      }
    }

    // 渲染搜索结果下拉列表
    function renderCitySearchResults(locations) {
      if (!citySearchResults) return;

      if (locations.length === 0) {
        citySearchResults.innerHTML = '<div class="city-result-item city-result-empty">未找到匹配城市</div>';
        citySearchResults.style.display = "block";
        return;
      }

      const html = locations.map(loc => {
        const admParts = [loc.adm1, loc.adm2].filter(p => p && p !== loc.name);
        const admText = admParts.length > 0 ? ` ${admParts.join(" · ")}` : "";
        return `
          <div class="city-result-item" data-city-id="${loc.id}" data-city-name="${loc.name}" data-city-adm1="${loc.adm1 || ""}" data-city-adm2="${loc.adm2 || ""}" data-city-lat="${loc.lat || ""}" data-city-lon="${loc.lon || ""}">
            <span class="city-result-name">${loc.name}</span>
            <span class="city-result-adm">${admText}</span>
          </div>
        `;
      }).join("");

      citySearchResults.innerHTML = html;
      citySearchResults.style.display = "block";

      // 绑定点击事件
      citySearchResults.querySelectorAll(".city-result-item").forEach(item => {
        if (item.classList.contains("city-result-empty")) return;
        item.addEventListener("click", () => {
          selectCity({
            id: item.dataset.cityId,
            name: item.dataset.cityName,
            adm1: item.dataset.cityAdm1,
            adm2: item.dataset.cityAdm2,
            lat: item.dataset.cityLat,
            lon: item.dataset.cityLon
          });
        });
      });
    }

    // 选中城市 → 保存 + 自动刷新天气
    function selectCity(loc) {
      currentLocation = {
        id: loc.id,
        name: loc.name,
        adm1: loc.adm1 || "",
        adm2: loc.adm2 || "",
        lat: loc.lat || "",
        lon: loc.lon || ""
      };

      // 持久化到 localStorage
      try {
        localStorage.setItem("qweather_location", JSON.stringify(currentLocation));
      } catch (e) {
        // localStorage 写入失败，忽略
      }

      // 更新 UI
      updateLocationLabel();
      if (citySearchInput) citySearchInput.value = "";
      if (citySearchResults) citySearchResults.style.display = "none";

      // 收起城市编辑区域
      if (locationEditArea) {
        locationEditArea.style.display = "none";
        if (editLocationButton) editLocationButton.textContent = "修改城市";
      }

      // 自动获取新城市的天气
      getTodayWeather();
    }

    // GPS 自动定位
    async function autoLocate() {
      if (!navigator.geolocation) {
        if (currentLocationLabel) {
          currentLocationLabel.textContent = "当前浏览器不支持定位功能";
        }
        return;
      }

      // UI 反馈
      if (geoLocateButton) {
        geoLocateButton.textContent = "⏳";
        geoLocateButton.disabled = true;
      }
      if (currentLocationLabel) {
        currentLocationLabel.textContent = "正在定位...";
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const loc = await reverseGeocode(latitude, longitude);

          if (loc) {
            selectCity(loc);
          } else {
            if (currentLocationLabel) {
              currentLocationLabel.textContent = "定位成功但无法识别城市，请手动输入";
            }
          }

          if (geoLocateButton) {
            geoLocateButton.textContent = "📍";
            geoLocateButton.disabled = false;
          }
        },
        (error) => {
          let msg = "定位失败";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "定位被拒绝，请手动输入城市名";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = "定位信息不可用，请手动输入城市名";
          } else if (error.code === error.TIMEOUT) {
            msg = "定位超时，请手动输入城市名";
          }

          if (currentLocationLabel) {
            currentLocationLabel.textContent = msg;
          }
          if (geoLocateButton) {
            geoLocateButton.textContent = "📍";
            geoLocateButton.disabled = false;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }

    // 绑定城市搜索输入事件（防抖 300ms）
    if (citySearchInput) {
      citySearchInput.addEventListener("input", () => {
        clearTimeout(citySearchTimer);
        const keyword = citySearchInput.value;

        if (keyword.trim().length === 0) {
          citySearchResults.style.display = "none";
          return;
        }

        citySearchTimer = setTimeout(async () => {
          const results = await searchCities(keyword);
          renderCitySearchResults(results);
        }, 300);
      });

      // 点击输入框时如果已有内容，重新触发搜索
      citySearchInput.addEventListener("focus", () => {
        if (citySearchInput.value.trim().length > 0) {
          citySearchInput.dispatchEvent(new Event("input"));
        }
      });
    }

    // 点击页面其他地方关闭搜索结果
    document.addEventListener("click", (e) => {
      if (citySearchResults && citySearchInput &&
          !citySearchResults.contains(e.target) && e.target !== citySearchInput) {
        citySearchResults.style.display = "none";
      }
    });

    // 绑定 GPS 定位按钮
    if (geoLocateButton) {
      geoLocateButton.addEventListener("click", autoLocate);
    }

    // 初始化时更新位置标签
    updateLocationLabel();

    function formatChineseDate(date) {
      const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
      return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
    }

    function formatHour(date) {
      return `${String(date.getHours()).padStart(2, "0")}:00`;
    }

    function formatHourRange(startDate, endDate) {
      return `${formatHour(startDate)}-${formatHour(endDate)}`;
    }

    function isSameDate(dateA, dateB) {
      return dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate();
    }

    function parseHourlyForecast(hourlyData) {
      if (!hourlyData || hourlyData.code !== "200" || !Array.isArray(hourlyData.hourly)) {
        return [];
      }

      return hourlyData.hourly.map((item) => ({
        time: new Date(item.fxTime),
        temp: Number(item.temp),
        text: item.text
      })).filter((item) => Number.isFinite(item.temp) && !Number.isNaN(item.time.getTime()));
    }

    function getErrorMessage(nowData, forecastData) {
      const error = nowData.error || forecastData.error;

      if (error && error.title === "Invalid Host") {
        return "和风天气返回 403 Invalid Host：当前 API Key 与 API Host 不匹配。";
      }

      if (error) {
        return `接口返回异常：${error.title || "未知错误"}：${error.detail || ""}`;
      }

      return "接口返回异常，请检查 API Key、API Host、免费版 V7 接口权限或账号额度。";
    }

    function getBaseFeedingAdvice(feedingBaseTemp, species) {
      if (feedingBaseTemp <= 10) {
        return {
          physiologicalState: "低温停食",
          feedingAmount: 0,
          feedingFrequency: "停止投喂",
          feedingNote: "水温过低，代谢明显下降，必须停食并保持环境安静。"
        };
      }

      if (feedingBaseTemp <= 19) {
        return {
          physiologicalState: "低温少动",
          feedingAmount: 0,
          feedingFrequency: "停止投喂",
          feedingNote: "20℃以下不建议投喂，避免食物在肠胃中滞留。"
        };
      }

      if (feedingBaseTemp < species.minTemp) {
        return {
          physiologicalState: "恢复进食",
          feedingAmount: 30,
          feedingFrequency: "4-5天一喂",
          feedingNote: `尚未达到${species.name}的最佳生长期下限 ${species.minTemp}℃，少量投喂易消化食物即可。`
        };
      }

      if (feedingBaseTemp <= species.maxTemp) {
        return {
          physiologicalState: "最佳生长期",
          feedingAmount: 100,
          feedingFrequency: "2-3天一喂",
          feedingNote: `今日最高温落在该物种最佳区间 ${species.minTemp}-${species.maxTemp}℃，消化与活动状态较理想。`
        };
      }

      if (feedingBaseTemp <= 33) {
        return {
          physiologicalState: "旺盛摄食期",
          feedingAmount: 100,
          feedingFrequency: "2-3天一喂",
          feedingNote: "温度高于该物种最佳上限，但仍在可积极摄食范围内，投喂后要及时清理残饵。"
        };
      }

      return {
        physiologicalState: "高温应激",
        feedingAmount: 50,
        feedingFrequency: "减少投喂",
        feedingNote: "高温下残饵极易变质，投喂量减半，并优先考虑喷淋、换水、风扇等降温措施。"
      };
    }

    function getTodayHourlyForecast(envData) {
      const today = envData.systemDate;
      return envData.hourlyForecast.filter((item) => isSameDate(item.time, today));
    }

    function findHourForecast(hourlyForecast, targetHour) {
      return hourlyForecast.find((item) => item.time.getHours() === targetHour);
    }

    function findPeakInfo(envData) {
      const todayHours = getTodayHourlyForecast(envData);

      if (todayHours.length > 0) {
        return todayHours.reduce((peak, item) => item.temp > peak.temp ? item : peak, todayHours[0]);
      }

      const fallbackPeak = new Date(envData.systemDate);
      fallbackPeak.setHours(14, 0, 0, 0);

      return {
        time: fallbackPeak,
        temp: Number(envData.tempMax),
        text: "按常见午后高温估算"
      };
    }

    function calculateFeedingTimeAdvice(envData, careAdvice) {
      if (careAdvice.feedingAmount <= 0) {
        return {
          bestWindow: "今日不建议投喂",
          morningWindow: "今日已触发停喂条件，上班前也不建议补喂。",
          eveningWindow: "今日已触发停喂条件，傍晚也不建议补喂。",
          note: "先以温度稳定、水质稳定和龟的状态观察为主。"
        };
      }

      const peakInfo = findPeakInfo(envData);
      const bestStart = new Date(peakInfo.time);
      const bestEnd = new Date(peakInfo.time);
      bestStart.setHours(bestStart.getHours() - 4);
      bestEnd.setHours(bestEnd.getHours() - 3);

      const todayHours = getTodayHourlyForecast(envData);
      const morning8 = findHourForecast(todayHours, 8);
      const morning9 = findHourForecast(todayHours, 9);
      const morningCandidates = [morning8, morning9].filter(Boolean);
      const morningOk = morningCandidates.some((item) => item.temp >= 20) && Number(envData.tempMax) >= 25;

      let eveningCandidate = null;
      for (let hour = 17; hour <= 19; hour += 1) {
        const item = findHourForecast(todayHours, hour);
        if (!item || item.temp < 29) {
          continue;
        }

        const nextSixHours = envData.hourlyForecast.filter((hourItem) => {
          const diffHours = (hourItem.time - item.time) / 3600000;
          return diffHours >= 0 && diffHours <= 6;
        });

        const lowestNextSixHours = Math.min(...nextSixHours.map((hourItem) => hourItem.temp));
        const eveningDrop = item.temp - lowestNextSixHours;

        if (nextSixHours.length > 0 && eveningDrop < 6) {
          eveningCandidate = item;
          break;
        }
      }

      return {
        bestWindow: `${formatHourRange(bestStart, bestEnd)}（最高温约 ${formatHour(peakInfo.time)}，${peakInfo.temp}℃）`,
        morningWindow: morningOk
          ? "上班前 08:00-09:00 温度已达到可消化区间，可以少量投喂。"
          : "上班前 08:00-09:00 温度偏低或升温条件不足，建议等待更暖时段。",
        eveningWindow: eveningCandidate
          ? `傍晚 ${formatHour(eveningCandidate.time)} 左右仍有 ${eveningCandidate.temp}℃，且后六小时降温未达到6℃，可以作为补喂窗口。`
          : "傍晚暂不满足“≥29℃，且后六小时内降温小于6℃”的补喂条件。",
        note: "投喂时间优先选在最高温前 3-4 小时，让进食后经历升温阶段，更利于消化。"
      };
    }

    function getCareAlertLevel(alerts) {
      if (alerts.some((alert) => alert.level === "red")) {
        return "red";
      }

      if (alerts.some((alert) => alert.level === "orange")) {
        return "orange";
      }

      return "safe";
    }

    function parseDateOnly(value) {
      if (!value) return null;
      const [year, month, day] = String(value).split("-").map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    }

    function dayDifference(fromDate, toDate) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      return Math.round((to - from) / msPerDay);
    }

    function hasEggLayerTurtles() {
      return turtleRecords.some((record) => {
        const stageKey = readField(record, "lifeStage") || "";
        const eggLogs = readField(record, "eggLogs") || [];
        return stageKey === "mature" || stageKey === "breeder" || eggLogs.length > 0;
      });
    }

    function getEggReminders() {
      const today = new Date();
      const reminders = [];

      turtleRecords.forEach((record) => {
        const nickname = readField(record, "nickname") || "未命名";
        const eggLogs = (readField(record, "eggLogs") || [])
          .map((log) => ({ ...log, dateObject: parseDateOnly(log.date) }))
          .filter((log) => log.dateObject)
          .sort((a, b) => a.dateObject - b.dateObject);

        if (eggLogs.length === 0) return;

        const latest = eggLogs[eggLogs.length - 1];
        const nextLayDate = new Date(latest.dateObject);
        nextLayDate.setDate(nextLayDate.getDate() + 20);
        const daysToNextLay = dayDifference(today, nextLayDate);

        if (daysToNextLay >= -3 && daysToNextLay <= 5) {
          reminders.push(`${nickname} 距上次产蛋已接近 20 天，可能进入下一轮产蛋窗口，请留意躁动、试挖和食欲变化。`);
        }

        const currentYearLogs = eggLogs.filter((log) => log.dateObject.getFullYear() === today.getFullYear());
        const firstLog = currentYearLogs[0] || eggLogs[0];
        const annualDate = new Date(today.getFullYear(), firstLog.dateObject.getMonth(), firstLog.dateObject.getDate());
        const daysToAnnualDate = dayDifference(today, annualDate);

        if (daysToAnnualDate >= 0 && daysToAnnualDate <= 10) {
          reminders.push(`${nickname} 往年首次产蛋期即将临近，建议提前准备产房、湿润垫材和补钙食物。`);
        }
      });

      return reminders;
    }

    function calculateCareAdvice(envData) {
      const species = speciesData[currentSpecies];
      const currentTemp = Number(envData.currentTemp);
      const tempMax = Number(envData.tempMax);
      const tempMin = Number(envData.tempMin);
      const tomorrowMinTemp = Number(envData.tomorrowMinTemp);
      const dayAfterMinTemp = Number(envData.dayAfterMinTemp);
      const weatherText = envData.weatherText;
      const currentMonth = Number(envData.currentMonth);
      const feedingBaseTemp = tempMax;

      const lowestFutureMinTemp = Math.min(tomorrowMinTemp, dayAfterMinTemp);
      const lowestThreeDayMinTemp = Math.min(tempMin, tomorrowMinTemp, dayAfterMinTemp);
      const futureMinDropFromTodayMin = tempMin - lowestFutureMinTemp;
      const hasSharpCooling =
        futureMinDropFromTodayMin >= 8 ||
        tomorrowMinTemp < 20 ||
        dayAfterMinTemp < 20;

      let advice = getBaseFeedingAdvice(feedingBaseTemp, species);
      const alerts = [];
      const safeMessage = "当前环境稳定，水体状态良好";

      if ((currentMonth === 9 || currentMonth === 10) &&
          feedingBaseTemp >= species.minTemp &&
          feedingBaseTemp <= Math.min(species.maxTemp + 1, 30)) {
        advice = {
          physiologicalState: "秋季贴膘",
          feedingAmount: feedingBaseTemp <= species.maxTemp ? 100 : 80,
          feedingFrequency: "2-3天一喂",
          feedingNote: "气候适宜，建议增加优质高蛋白饲料（如鱼虾肉），为冬眠储备脂肪。"
        };
      }

      if ((currentMonth === 12 || currentMonth === 1 || currentMonth === 2) && currentTemp < 15) {
        const winterAdvice = {
          ...advice,
          feedingAmount: 0,
          feedingFrequency: "停止投喂",
          feedingNote: "深度冬眠中，请保持环境安静，切勿打扰及喂食。",
          safeMessage: "深度冬眠中，请保持环境安静，切勿打扰及喂食。",
          alerts: []
        };

        return {
          ...winterAdvice,
          alertLevel: "safe",
          species,
          lowestFutureMinTemp,
          feedingBaseTemp,
          feedingTimeAdvice: calculateFeedingTimeAdvice(envData, winterAdvice)
        };
      }

      if (hasSharpCooling) {
        if (currentMonth >= 3 && currentMonth <= 5) {
          alerts.push({
            level: "orange",
            text: "【倒春寒预警】未来两天气温大幅下降！水温波动易导致感冒和肠胃炎，今日请暂停投喂，切勿惊扰，等待气温回暖。"
          });
          advice.feedingAmount = 0;
          advice.feedingFrequency = "今日暂停";
          advice.feedingNote = "已触发倒春寒预警，今日建议停食观察。";
        } else if (currentMonth >= 6 && currentMonth <= 8) {
          alerts.push({
            level: "orange",
            text: "【夏季骤降预警】未来最低温较今日最低温明显下降，或即将跌破20℃。请减少投喂并观察水体，若静水环境浑浊、闷热或龟状态异常，则直接停喂。"
          });
          advice.feedingAmount = Math.min(advice.feedingAmount, 50);
          advice.feedingFrequency = "减量观察";
          advice.feedingNote = "夏季降温不一定必须停喂，但应减量，并以水质和龟的状态为准。";
        } else if (currentMonth >= 9 && currentMonth <= 11) {
          if (lowestThreeDayMinTemp <= 15) {
            alerts.push({
              level: "red",
              text: "【冬眠清肠预警】寒潮来袭，即将跌破15℃！请立刻彻底停食，排空肠胃准备越冬，严防肠道残饵在低温下腐败致命！"
            });
            advice.feedingAmount = 0;
            advice.feedingFrequency = "立即停喂";
            advice.feedingNote = "已触发冬眠清肠预警，今日必须停止投喂。";
          } else {
            alerts.push({
              level: "orange",
              text: "【秋季降温预警】气温转凉，请减少投喂量，并尽量在正午气温最高时喂食易消化食物。"
            });
            advice.feedingAmount = Math.min(advice.feedingAmount, 30);
            advice.feedingFrequency = "少量正午投喂";
            advice.feedingNote = "秋季降温期只建议少量易消化食物，避免夜间低温影响消化。";
          }
        }
      }

      if (currentTemp >= 36 || tempMax >= 36) {
        alerts.push({
          level: "red",
          text: "【极端高温防爆藻预警】气温已达到或即将超过36℃！请立即进行降温处理：增加遮阴，开启风扇，加强喷淋或少量换水，并暂停投喂，防止残饵迅速变质坏水。"
        });
        advice.feedingAmount = 0;
        advice.feedingFrequency = "立即停喂";
        advice.feedingNote = "已触发极端高温预警，当前首要任务是降温和稳定水质。";
      } else if (currentTemp >= 34 || tempMax >= 34) {
        alerts.push({
          level: "orange",
          text: "【高温预警】气温达到34℃以上，请考虑喷淋、换水、风扇、遮阳等降温措施，并减少投喂，避免残留食物高温腐败。"
        });
        advice.feedingAmount = Math.min(advice.feedingAmount, 50);
        advice.feedingFrequency = "减少投喂";
        advice.feedingNote = "高温下残饵变质速度很快，建议投喂减半，并在进食后及时清理。";
      }

      if (alerts.length === 0 && currentTemp >= 32 && weatherText.includes("晴")) {
        alerts.push({
          level: "red",
          text: "高温暴晒警告：绿水极易爆藻缺氧，请立即加盖遮阳网，并停止投喂防残饵坏水！"
        });
        advice.feedingAmount = 0;
        advice.feedingFrequency = "今日停食";
        advice.feedingNote = "已触发高温暴晒预警，今日请先保水质和遮阴。";
      }

      if (alerts.length === 0 && tempMax - tempMin >= 10) {
        alerts.push({
          level: "orange",
          text: "温差过大：水温可能剧烈波动，今日停食防范肠胃炎！"
        });
        advice.feedingAmount = 0;
        advice.feedingFrequency = "今日停食";
        advice.feedingNote = "今日温差较大，建议停食观察，避免肠胃负担。";
      }

      if (hasEggLayerTurtles()) {
        advice.feedingNote = `${advice.feedingNote} 档案中存在成熟或产蛋个体，投喂时建议增加钙源、维生素与优质动物蛋白，并保持营养均衡。`;
      }

      const completeAdvice = {
        ...advice,
        safeMessage,
        alerts,
        species,
        alertLevel: getCareAlertLevel(alerts),
        lowestFutureMinTemp,
        feedingBaseTemp
      };

      return {
        ...completeAdvice,
        feedingTimeAdvice: calculateFeedingTimeAdvice(envData, completeAdvice)
      };
    }

    function renderWeatherAndCare(envData, careAdvice) {
      const alertHtml = careAdvice.alerts.length
        ? careAdvice.alerts.map((alert) => `
            <div class="alert-box alert-${alert.level}">${alert.text}</div>
          `).join("")
        : `<div class="alert-box alert-safe">${careAdvice.safeMessage}</div>`;
      const eggReminders = getEggReminders();
      const eggReminderHtml = eggReminders.length
        ? `<div class="egg-reminder-card"><strong>产蛋提醒</strong>${eggReminders.map((item) => `<div>${item}</div>`).join("")}</div>`
        : "";
      const speciesSummaryHtml = renderSpeciesCountSummary();

      result.innerHTML = `
        <div class="content-grid">
          <article class="weather-card">
            <div class="card-header">
              <h2 class="card-title">${envData.locationName}今日天气</h2>
              <div class="date-pill">${envData.todayDateText}</div>
            </div>

            <div class="weather-now">
              <div>
                <div class="label">当前天气状况</div>
                <div class="weather-text">${envData.weatherText}</div>
              </div>

              <div>
                <div class="label">实时气温</div>
                <div class="weather-temp">${envData.currentTemp}℃</div>
              </div>
            </div>

            <div class="weather-grid">
              <div class="weather-item">
                <div class="label">今日最高温</div>
                <div class="value">${envData.tempMax}℃</div>
              </div>

              <div class="weather-item">
                <div class="label">今日最低温</div>
                <div class="value">${envData.tempMin}℃</div>
              </div>
            </div>

            ${speciesSummaryHtml}
            ${eggReminderHtml}
          </article>

          <article class="care-card alert-level-${careAdvice.alertLevel}">
            <div class="card-header">
              <h2 class="card-title">今日养护建议</h2>
            </div>

            <div class="care-grid care-focus-grid">
              <div class="care-item">
                <div class="label">当前品种</div>
                <div class="value">${careAdvice.species.name}</div>
              </div>

              <div class="care-item">
                <div class="label">建议投喂量</div>
                <div class="feeding-percent">${careAdvice.feedingAmount}%</div>
              </div>

              <div class="care-item">
                <div class="label">所处生理状态</div>
                <div class="value">${careAdvice.physiologicalState}</div>
              </div>

              <div class="care-item care-time-item">
                <div class="label">最佳投喂时间</div>
                <div class="feeding-time-main">${careAdvice.feedingTimeAdvice.bestWindow.split("（")[0]}</div>
              </div>
            </div>

            <div class="care-detail-card">
              <div class="time-window"><strong>频率建议：</strong>${careAdvice.feedingFrequency}。${careAdvice.feedingNote}</div>
              <div class="time-window"><strong>物种温区：</strong>${careAdvice.species.minTemp}-${careAdvice.species.maxTemp}℃；${careAdvice.species.canHibernate ? "可冬眠品种" : "不建议冬眠品种"}。</div>
              <div class="time-window"><strong>判断基准：</strong>今日最高温 ${careAdvice.feedingBaseTemp}℃，而不是当前瞬时温度。</div>
              <div class="time-window"><strong>最佳窗口说明：</strong>${careAdvice.feedingTimeAdvice.bestWindow}</div>
              <div class="time-window"><strong>上班前：</strong>${careAdvice.feedingTimeAdvice.morningWindow}</div>
              <div class="time-window"><strong>傍晚：</strong>${careAdvice.feedingTimeAdvice.eveningWindow}</div>
              <div class="time-window">${careAdvice.feedingTimeAdvice.note}</div>
            </div>

            ${alertHtml}

            <div class="trend-section">
              <h3 class="trend-title">未来两日趋势</h3>
              <div class="trend-grid">
                <div class="trend-item">
                  <div class="trend-day">明天</div>
                  <div class="trend-temp">${envData.tomorrowMaxTemp}℃ / ${envData.tomorrowMinTemp}℃</div>
                </div>

                <div class="trend-item">
                  <div class="trend-day">后天</div>
                  <div class="trend-temp">${envData.dayAfterMaxTemp}℃ / ${envData.dayAfterMinTemp}℃</div>
                </div>
              </div>
            </div>
          </article>
        </div>
      `;
    }

    function recalculateAndRender() {
      if (!environmentData) {
        return;
      }

      const careAdvice = calculateCareAdvice(environmentData);

      if (debugPanel) {
        debugPanel.textContent = JSON.stringify({
          currentSpecies,
          environmentData,
          careAdvice
        }, null, 2);
      }

      renderWeatherAndCare(environmentData, careAdvice);
    }

    async function getTodayWeather() {
      weatherButton.disabled = true;
      weatherButton.textContent = "正在获取天气...";
      result.innerHTML = "";
      if (debugPanel) {
        debugPanel.textContent = "Debug Panel：正在请求和风天气接口...";
      }

      try {
        const nowUrl = buildQWeatherUrl("/v7/weather/now");
        const forecastUrl = buildQWeatherUrl("/v7/weather/3d");
        const hourlyUrl = buildQWeatherUrl("/v7/weather/24h");

        const [nowResponse, forecastResponse, hourlyResponse] = await Promise.all([
          fetch(nowUrl),
          fetch(forecastUrl),
          fetch(hourlyUrl).catch(() => null)
        ]);

        const nowData = await nowResponse.json();
        const forecastData = await forecastResponse.json();
        const hourlyData = hourlyResponse ? await hourlyResponse.json() : { code: "FETCH_FAILED", hourly: [] };

        if (nowData.code !== "200" || forecastData.code !== "200") {
          const rawErrorData = {
            requestInfo: {
              apiHost: QWEATHER_API_HOST,
              location: currentLocation.id,
              locationName: currentLocation.name,
              nowStatus: nowResponse.status,
              forecastStatus: forecastResponse.status,
              hourlyStatus: hourlyResponse ? hourlyResponse.status : "FETCH_FAILED"
            },
            currentWeather: nowData,
            threeDayForecast: forecastData,
            hourlyWeather: hourlyData
          };

          if (debugPanel) {
            debugPanel.textContent = JSON.stringify(rawErrorData, null, 2);
          }
          throw new Error(getErrorMessage(nowData, forecastData));
        }

        const systemDate = new Date();
        const currentMonth = systemDate.getMonth() + 1;
        const now = nowData.now;
        const today = forecastData.daily[0];
        const tomorrow = forecastData.daily[1];
        const dayAfter = forecastData.daily[2];
        const hourlyForecast = parseHourlyForecast(hourlyData);

        environmentData = {
          locationName: currentLocation.name,
          systemDate,
          todayDateText: formatChineseDate(systemDate),
          currentMonth,
          weatherText: now.text,
          currentTemp: Number(now.temp),
          tempMax: Number(today.tempMax),
          tempMin: Number(today.tempMin),
          tomorrowMaxTemp: Number(tomorrow.tempMax),
          tomorrowMinTemp: Number(tomorrow.tempMin),
          dayAfterMaxTemp: Number(dayAfter.tempMax),
          dayAfterMinTemp: Number(dayAfter.tempMin),
          hourlyForecast,
          raw: {
            currentWeather: nowData,
            threeDayForecast: forecastData,
            hourlyWeather: hourlyData
          }
        };

        recalculateAndRender();
      } catch (error) {
        result.innerHTML = `<p class="error">${error.message}</p>`;
        if (debugPanel) {
          debugPanel.textContent += `

请求失败：${error.message}`;
        }
      } finally {
        weatherButton.disabled = false;
        weatherButton.textContent = "获取今日当地天气";
      }
    }

    speciesSelect.addEventListener("change", (event) => {
      selectSpecies(event.target.value);
    });

    weatherButton.addEventListener("click", getTodayWeather);
    createTurtleButton.addEventListener("click", saveNewTurtle);
    refreshTurtlesButton.addEventListener("click", fetchTurtles);

    // ==========================================================================
    // REST 辅助：携带 session token 的请求（登录后操作需要）
    // ==========================================================================
    async function bmobRestRequestWithSession(path, options = {}) {
      // 代理模式下认证头由 server.js / Vercel Function 自动注入
      const headers = { "Content-Type": "application/json" };
      if (options.sessionToken) {
        headers["x-session-token"] = options.sessionToken;
      }

      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`${BMOB_API_BASE}${path}`, {
          method: options.method || "GET",
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.code) throw data;
        return data;
      } finally {
        clearTimeout(timerId);
      }
    }

    // ==========================================================================
    // 认证模块：checkLoginState / handleLogin / handleRegister / handleLogout
    // ==========================================================================

    function setAuthMessage(msg, isError = false) {
      authMessage.textContent = msg;
      authMessage.className = `auth-message ${isError ? "auth-error" : "auth-info"}`;
      authMessage.style.display = msg ? "" : "none";
    }

    async function checkLoginState() {
      // 恢复"记住登录信息"和"自动登录"勾选状态
      const rememberLogin = localStorage.getItem("bmob_remember_login") === "true";
      const autoLogin     = localStorage.getItem("bmob_auto_login") === "true";
      if (rememberLoginCheckbox) rememberLoginCheckbox.checked = rememberLogin;
      if (autoLoginCheckbox)     autoLoginCheckbox.checked     = autoLogin;

      // 恢复记住的用户名和密码
      if (rememberLogin) {
        const savedUsername = localStorage.getItem("bmob_saved_username") || "";
        const savedPassword = localStorage.getItem("bmob_saved_password") || "";
        if (authUsername) authUsername.value = savedUsername;
        if (authPassword) authPassword.value = savedPassword;
      }

      // 检查本地缓存的 session token 是否有效
      const sessionToken = localStorage.getItem("bmob_session_token");
      if (sessionToken) {
        try {
          const headers = USE_LOCAL_PROXY
            ? { "Content-Type": "application/json", "x-session-token": sessionToken }
            : {
                "X-Bmob-Application-Id": BMOB_APPLICATION_ID,
                "X-Bmob-REST-API-Key": BMOB_REST_API_KEY,
                "X-Bmob-Safe-Code": BMOB_API_SAFE_CODE,
                "X-Bmob-Session-Token": sessionToken,
                "Content-Type": "application/json"
              };
          const res = await fetch(`${BMOB_API_BASE}/users/me`, { method: "GET", headers });
          const user = await res.json().catch(() => ({}));
          if (res.ok && !user.code && user.objectId) {
            await onLoginSuccess(user.username || user.objectId, user.objectId, sessionToken);
            return;
          }
          // session 无效，清理本地
          localStorage.removeItem("bmob_session_token");
          localStorage.removeItem("bmob_user_id");
        } catch {
          localStorage.removeItem("bmob_session_token");
          localStorage.removeItem("bmob_user_id");
        }
      }

      // 如果开启了自动登录且有记住的账号密码，尝试自动登录
      if (autoLogin) {
        const savedUsername = localStorage.getItem("bmob_saved_username") || "";
        const savedPassword = localStorage.getItem("bmob_saved_password") || "";
        if (savedUsername && savedPassword) {
          setAuthMessage("正在自动登录...", false);
          const autoLoginSuccess = await tryAutoLogin(savedUsername, savedPassword);
          if (autoLoginSuccess) return;
        }
      }

      showAuthOverlay();
    }

    function showAuthOverlay() {
      authOverlay.style.display = "flex";
      mainApp.style.display    = "none";
    }

    // 自动登录：用保存的账号密码调用登录接口
    async function tryAutoLogin(username, password) {
      try {
        const loginUrl = `${BMOB_API_BASE}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const res = await fetch(loginUrl, {
          method: "GET",
          headers: USE_LOCAL_PROXY
            ? { "Content-Type": "application/json" }
            : {
                "X-Bmob-Application-Id": BMOB_APPLICATION_ID,
                "X-Bmob-REST-API-Key": BMOB_REST_API_KEY,
                "X-Bmob-Safe-Code": BMOB_API_SAFE_CODE,
                "Content-Type": "application/json"
              }
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && !json.code && json.sessionToken) {
          localStorage.setItem("bmob_session_token", json.sessionToken);
          localStorage.setItem("bmob_user_id", json.objectId);
          await onLoginSuccess(json.username, json.objectId, json.sessionToken);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    async function onLoginSuccess(username, userId, sessionToken) {
      // 存储 REST fallback 凭据
      if (sessionToken) {
        localStorage.setItem("bmob_session_token", sessionToken);
        localStorage.setItem("bmob_user_id", userId);
      }

      authOverlay.style.display = "none";
      mainApp.style.display     = "";

      if (currentUserLabel) {
        currentUserLabel.textContent = `👤 ${username || "已登录"}`;
      }

      // 更新位置标签
      updateLocationLabel();

      // 启动主应用
      populateSpeciesControls();
      const ready = await initBmob();
      if (ready) await fetchTurtles();

      // 登录后自动获取已保存城市的天气
      if (currentLocation && currentLocation.id) {
        getTodayWeather();
      }
    }

    async function handleLogin() {
      const username = authUsername.value.trim();
      const password = authPassword.value;

      if (!username || !password) {
        setAuthMessage("请填写账号和密码。", true);
        return;
      }

      loginButton.disabled = true;
      setAuthMessage("正在登录...", false);

      try {
        // 通过代理或直连调用 Bmob 登录 API
        const loginUrl = `${BMOB_API_BASE}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const res = await fetch(loginUrl, {
          method: "GET",
          headers: USE_LOCAL_PROXY
            ? { "Content-Type": "application/json" }
            : {
                "X-Bmob-Application-Id": BMOB_APPLICATION_ID,
                "X-Bmob-REST-API-Key": BMOB_REST_API_KEY,
                "X-Bmob-Safe-Code": BMOB_API_SAFE_CODE,
                "Content-Type": "application/json"
              }
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.code) throw json;

        // 登录成功，存储 session
        localStorage.setItem("bmob_session_token", json.sessionToken);
        localStorage.setItem("bmob_user_id", json.objectId);

        // 处理"记住登录信息"和"自动登录"
        const rememberLogin = rememberLoginCheckbox?.checked || false;
        const autoLogin     = autoLoginCheckbox?.checked || false;
        localStorage.setItem("bmob_remember_login", String(rememberLogin));
        localStorage.setItem("bmob_auto_login", String(autoLogin));

        if (rememberLogin) {
          localStorage.setItem("bmob_saved_username", username);
          localStorage.setItem("bmob_saved_password", password);
        } else {
          localStorage.removeItem("bmob_saved_username");
          localStorage.removeItem("bmob_saved_password");
          localStorage.removeItem("bmob_auto_login");
          if (autoLoginCheckbox) autoLoginCheckbox.checked = false;
        }

        // 如果没勾选记住登录信息，自动登录也应该取消
        if (!rememberLogin && autoLoginCheckbox) {
          autoLoginCheckbox.checked = false;
          localStorage.setItem("bmob_auto_login", "false");
        }

        await onLoginSuccess(json.username, json.objectId, json.sessionToken);
      } catch (error) {
        const msg = formatBmobError(error);
        setAuthMessage(
          msg.includes("101") || msg.includes("username") || msg.includes("password")
            ? "账号或密码错误，请重新输入。"
            : `登录失败：${msg}`,
          true
        );
      } finally {
        loginButton.disabled = false;
      }
    }

    async function handleRegister() {
      const username = authUsername.value.trim();
      const password = authPassword.value;
      const inviteCode = authInviteCode ? authInviteCode.value.trim() : "";

      if (!username || !password) {
        setAuthMessage("请填写账号和密码后再注册。", true);
        return;
      }
      if (password.length < 6) {
        setAuthMessage("密码至少需要 6 位。", true);
        return;
      }
      // 邀请码校验 — 阻止无效注册
      if (!isValidInviteCode(inviteCode)) {
        setAuthMessage("邀请码无效或未填写。注册需要邀请码，请联系管理员获取。", true);
        return;
      }

      registerButton.disabled = true;
      setAuthMessage("正在注册...", false);

      try {
        // 通过代理或直连调用 Bmob 注册 API
        const res = await fetch(`${BMOB_API_BASE}/users`, {
          method: "POST",
          headers: USE_LOCAL_PROXY
            ? { "Content-Type": "application/json" }
            : {
                "Content-Type": "application/json",
                "X-Bmob-Application-Id": BMOB_APPLICATION_ID,
                "X-Bmob-REST-API-Key": BMOB_REST_API_KEY,
                "X-Bmob-Safe-Code": BMOB_API_SAFE_CODE
              },
          body: JSON.stringify({ username, password })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.code) throw json;

        setAuthMessage("注册成功！正在自动登录...", false);
        await handleLogin();
      } catch (error) {
        const msg = formatBmobError(error);
        setAuthMessage(
          msg.includes("202") || msg.includes("username") || msg.includes("exist")
            ? "该账号已存在，请直接登录或换一个账号名。"
            : `注册失败：${msg}`,
          true
        );
      } finally {
        registerButton.disabled = false;
      }
    }

    function handleLogout() {
      if (typeof Bmob !== "undefined" && Bmob.User?.current) {
        try { Bmob.User.logout?.(); } catch {/*忽略*/}
      }
      localStorage.removeItem("bmob_session_token");
      localStorage.removeItem("bmob_user_id");
      // 手动退出时取消自动登录，但保留记住的账号密码（方便下次手动登录）
      localStorage.setItem("bmob_auto_login", "false");
      if (autoLoginCheckbox) autoLoginCheckbox.checked = false;
      turtleRecords = [];
      environmentData = null;
      result.innerHTML = "";
      turtleList.innerHTML = `<div class="archive-message">正在准备档案列表...</div>`;
      showAuthOverlay();
    }

    // 绑定登录/注册/退出事件
    loginButton.addEventListener("click", handleLogin);
    registerButton.addEventListener("click", handleRegister);
    logoutButton.addEventListener("click", handleLogout);

    // "记住登录信息"取消勾选时，自动取消"自动登录"
    if (rememberLoginCheckbox) {
      rememberLoginCheckbox.addEventListener("change", () => {
        if (!rememberLoginCheckbox.checked && autoLoginCheckbox) {
          autoLoginCheckbox.checked = false;
        }
      });
    }

    // "自动登录"勾选时，自动勾选"记住登录信息"
    if (autoLoginCheckbox) {
      autoLoginCheckbox.addEventListener("change", () => {
        if (autoLoginCheckbox.checked && rememberLoginCheckbox) {
          rememberLoginCheckbox.checked = true;
        }
      });
    }

    // 修改城市按钮：展开/收起城市搜索区域
    if (editLocationButton) {
      editLocationButton.addEventListener("click", () => {
        if (locationEditArea) {
          const isVisible = locationEditArea.style.display !== "none";
          locationEditArea.style.display = isVisible ? "none" : "";
          editLocationButton.textContent = isVisible ? "修改城市" : "收起";
          if (!isVisible && citySearchInput) {
            citySearchInput.focus();
          }
        }
      });
    }

    // 注册模式下显示邀请码输入框，登录模式下隐藏
    const authInviteField = document.getElementById("authInviteField");
    const authHint        = document.getElementById("authHint");

    registerButton.addEventListener("click", () => {
      // 点击注册按钮时展开邀请码输入框
      if (authInviteField) {
        authInviteField.style.display = "";
        setTimeout(() => authInviteCode?.focus(), 100);
      }
      if (authHint) {
        authHint.textContent = "注册需要邀请码，无邀请码请联系管理员。";
      }
    });

    loginButton.addEventListener("click", () => {
      // 点击登录按钮时隐藏邀请码输入框
      if (authInviteField) authInviteField.style.display = "none";
      if (authHint) {
        authHint.textContent = "已有账号？直接登录即可。";
      }
    });

    // 支持回车键快速登录
    [authUsername, authPassword].forEach((el) => {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleLogin();
      });
    });

    // 邀请码输入框回车 → 触发注册
    if (authInviteCode) {
      authInviteCode.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleRegister();
      });
    }

    async function bootstrapArchiveModule() {
      populateSpeciesControls();
      const ready = await initBmob();
      if (ready) {
        await fetchTurtles();
      } else {
        await fetchTurtles();
      }
    }

    // 入口：优先检查登录状态
    checkLoginState();
