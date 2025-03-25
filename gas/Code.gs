// ==================== 配置常數 ====================
// 設定試算表 ID 和工作表名稱
// SPREADSHEET_ID: Google 試算表的唯一識別符，在 URL 中可找到
// 格式如：https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_ID = "1pe5TeuX_URnRv4u0y1ur5iZD033bL0KMPKlSBhatH-8";
// SHEET_NAME: 存儲任務數據的工作表名稱，如不存在會自動創建
const SHEET_NAME = "Tasks";

/**
 * 處理所有 HTTP GET 請求的入口函數
 * 當 GAS 網頁應用程式收到請求時自動執行
 * @param {Object} e - 事件對象，包含請求的所有參數
 * @returns {TextOutput} - 返回 JSON 格式的回應
 */
function doGet(e) {
  // 初始化回應物件，預設為失敗狀態
  var response = {
    status: false,
    message: "失敗",
    data: null,
  };

  try {
    // 根據請求參數中的 'do' 值執行對應操作
    if (e.parameter.do === "getTasks") {
      // 獲取所有任務列表
      response = getAllTasks();
    } else if (e.parameter.do === "saveTask") {
      // 保存新任務
      response = saveTask(e.parameter);
    } else if (e.parameter.do === "updateTask") {
      // 更新現有任務
      response = updateTask(e.parameter);
    } else if (e.parameter.do === "removeTask") {
      // 刪除指定任務
      response = removeTask(e.parameter);
    } else if (e.parameter.do === "updateOrder") {
      // 更新任務排序順序
      response = updateTaskOrder(e.parameter);
    } else {
      // 未知操作類型
      response.message = "未知操作";
    }
  } catch (error) {
    // 捕獲並記錄任何執行過程中的錯誤
    response.message = "錯誤: " + error.toString();
  }

  // 創建 JSON 格式的回應並設置 MIME 類型
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * 獲取所有任務
 * 從試算表中讀取全部任務並轉換為 JSON 格式
 * @returns {Object} - 包含狀態、消息和任務數據的對象
 */
function getAllTasks() {
  try {
    // 嘗試獲取指定的工作表
    const sheet =
      SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    // 如果工作表不存在，則創建一個新的工作表
    if (!sheet) {
      // 打開試算表
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      // 插入新工作表
      const newSheet = ss.insertSheet(SHEET_NAME);
      // 添加標題行，定義數據結構
      newSheet.appendRow(["id", "text", "date", "completed"]);
      // 返回成功狀態，但數據為空數組
      return { status: true, message: "成功", data: [] };
    }

    // 檢查工作表是否有標題行（若為空表）
    if (sheet.getLastRow() === 0) {
      // 添加標題行
      sheet.appendRow(["id", "text", "date", "completed"]);
      return { status: true, message: "成功", data: [] };
    }

    // 使用輔助函數將工作表數據轉換為 JSON 格式
    const data = convertSheetToJSON(sheet);
    // 返回成功狀態和任務數據
    return { status: true, message: "成功", data: data };
  } catch (error) {
    // 發生錯誤時返回失敗狀態和錯誤信息
    return { status: false, message: "獲取任務失敗: " + error.toString() };
  }
}

/**
 * 保存新任務
 * 將任務數據添加到試算表的新行
 * @param {Object} data - 包含任務信息的參數對象
 * @returns {Object} - 包含操作結果的狀態和消息
 */
function saveTask(data) {
  try {
    // 獲取或創建工作表
    const sheet = getOrCreateSheet();

    // 檢查 ID 是否已存在，避免重複添加
    const tasks = convertSheetToJSON(sheet);
    if (tasks.some((task) => task.id === data.id)) {
      return { status: false, message: "任務 ID 已存在" };
    }

    // 將新任務數據添加為試算表的新行
    sheet.appendRow([data.id, data.text, data.date, data.completed]);
    // 返回成功狀態
    return { status: true, message: "成功儲存任務" };
  } catch (error) {
    // 返回失敗狀態和錯誤信息
    return { status: false, message: "儲存任務失敗: " + error.toString() };
  }
}

/**
 * 更新現有任務
 * 根據任務 ID 修改試算表中對應行的數據
 * @param {Object} data - 包含更新信息的參數對象
 * @returns {Object} - 包含操作結果的狀態和消息
 */
function updateTask(data) {
  try {
    // 獲取工作表和所有現有任務
    const sheet = getOrCreateSheet();
    const tasks = convertSheetToJSON(sheet);

    // 查找要更新的任務索引
    const taskIndex = tasks.findIndex((task) => task.id === data.id);

    // 如果找不到任務，返回錯誤
    if (taskIndex === -1) {
      return { status: false, message: "找不到任務" };
    }

    // 獲取該任務的原始數據
    const originalTask = tasks[taskIndex];

    // 構建更新後的任務數據
    // 只更新提供的字段，未提供的字段保持原值
    const updatedTask = {
      id: data.id, // ID 保持不變
      // 如果提供了新值則使用新值，否則保留原值
      text: data.text !== undefined ? data.text : originalTask.text,
      date: data.date !== undefined ? data.date : originalTask.date,
      completed:
        data.completed !== undefined ? data.completed : originalTask.completed,
    };

    // 計算要更新的行號 (標題行索引為 1，數據從索引 2 開始)
    const rowToUpdate = taskIndex + 2;

    // 更新試算表中的對應行
    sheet
      .getRange(rowToUpdate, 1, 1, 4) // 獲取要更新的單元格範圍
      .setValues([
        [
          updatedTask.id,
          updatedTask.text,
          updatedTask.date,
          updatedTask.completed,
        ],
      ]); // 設置新值

    // 返回成功狀態
    return { status: true, message: "成功更新任務" };
  } catch (error) {
    // 返回失敗狀態和錯誤信息
    return { status: false, message: "更新任務失敗: " + error.toString() };
  }
}

/**
 * 刪除任務
 * 根據任務 ID 從試算表中刪除對應行
 * @param {Object} data - 包含任務 ID 的參數對象
 * @returns {Object} - 包含操作結果的狀態和消息
 */
function removeTask(data) {
  try {
    // 獲取工作表和所有任務
    const sheet = getOrCreateSheet();
    const tasks = convertSheetToJSON(sheet);

    // 查找要刪除的任務索引
    const taskIndex = tasks.findIndex((task) => task.id === data.id);

    // 如果找不到任務，返回錯誤
    if (taskIndex === -1) {
      return { status: false, message: "找不到任務" };
    }

    // 計算要刪除的行號 (標題行索引為 1，數據從索引 2 開始)
    const rowToDelete = taskIndex + 2;
    // 從試算表中刪除該行
    sheet.deleteRow(rowToDelete);

    // 返回成功狀態
    return { status: true, message: "成功刪除任務" };
  } catch (error) {
    // 返回失敗狀態和錯誤信息
    return { status: false, message: "刪除任務失敗: " + error.toString() };
  }
}

/**
 * 更新任務順序
 * 根據前端傳來的 ID 順序重新排列試算表中的任務
 * @param {Object} data - 包含排序後 ID 列表的參數對象
 * @returns {Object} - 包含操作結果的狀態和消息
 */
function updateTaskOrder(data) {
  try {
    // 解析從前端傳來的 JSON 格式的任務 ID 數組
    const ids = JSON.parse(data.ids);
    // 獲取工作表和所有現有任務
    const sheet = getOrCreateSheet();
    const tasks = convertSheetToJSON(sheet);

    // 按照新的順序重組任務列表
    const orderedTasks = [];
    for (const id of ids) {
      // 查找每個 ID 對應的完整任務數據
      const task = tasks.find((t) => t.id === id);
      if (task) {
        // 如果找到則添加到新列表
        orderedTasks.push(task);
      }
    }

    // 清除工作表中的數據行（保留標題行）
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      // 從第 2 行開始刪除，刪除 (lastRow-1) 行
      sheet.deleteRows(2, lastRow - 1);
    }

    // 將重新排序的任務數據轉換為二維數組，方便批量寫入
    const dataToInsert = orderedTasks.map((task) => [
      task.id,
      task.text,
      task.date,
      task.completed,
    ]);

    // 如果有數據則批量寫入工作表
    if (dataToInsert.length > 0) {
      // 從第 2 行第 1 列開始寫入
      sheet.getRange(2, 1, dataToInsert.length, 4).setValues(dataToInsert);
    }

    // 返回成功狀態
    return { status: true, message: "成功更新任務順序" };
  } catch (error) {
    // 返回失敗狀態和錯誤信息
    return { status: false, message: "更新任務順序失敗: " + error.toString() };
  }
}

/**
 * 獲取或創建工作表
 * 如果指定名稱的工作表不存在，則創建一個新的
 * @returns {Sheet} - Google 試算表的工作表對象
 */
function getOrCreateSheet() {
  // 打開指定的試算表
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  // 嘗試獲取指定名稱的工作表
  let sheet = ss.getSheetByName(SHEET_NAME);

  // 如果工作表不存在，則創建一個新的
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // 添加標題行，定義數據結構
    sheet.appendRow(["id", "text", "date", "completed"]);
  } else if (sheet.getLastRow() === 0) {
    // 如果工作表存在但為空，添加標題行
    sheet.appendRow(["id", "text", "date", "completed"]);
  }

  // 返回工作表對象
  return sheet;
}

/**
 * 將試算表轉換為 JSON
 * 將工作表的行數據轉換為更易於處理的 JSON 對象數組
 * @param {Sheet} sheet - Google 試算表的工作表對象
 * @returns {Array} - 包含所有任務數據的對象數組
 */
function convertSheetToJSON(sheet) {
  // 讀取工作表中的所有數據，包括標題行
  let data = sheet.getDataRange().getDisplayValues();

  // 如果只有標題行沒有數據，返回空數組
  if (data.length === 1) return [];

  // 獲取標題行作為對象的屬性名
  let headers = data[0];
  // 初始化結果數組
  let jsonData = [];

  // 遍歷所有數據行（從索引 1 開始，跳過標題行）
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let obj = {};

    // 將每一行的值與對應的標題關聯，創建對象
    headers.forEach(function (header, index) {
      // 特殊處理 "NULL" 字符串，轉換為 null 值
      obj[header] = row[index] === "NULL" ? null : row[index];
    });

    // 將創建的對象添加到結果數組
    jsonData.push(obj);
  }

  // 返回包含所有任務的 JSON 數組
  return jsonData;
}
