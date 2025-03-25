// 全局變數，在初始化時賦值
let emptyState; // 存放顯示「沒有任務」提示的 DOM 元素，用於控制無任務時的顯示狀態
let taskList; // 存放任務列表的 DOM 元素，所有任務項目的容器

// GAS API URL - 請替換為您的 GAS 網頁應用程式 URL
// 這是 Google Apps Script 部署後的網頁應用程式網址，所有資料操作都透過這個 API 進行
const API_URL =
  "https://script.google.com/macros/s/AKfycbwF5ETPJ8grLNrBoORUYNDkq8aaYBjfVqhCQtgEAwQaDC55qVsKjxvQF0ouuoLcMfSi/exec";

/**
 * 基礎 API 呼叫函數 - 用於所有與 GAS 後端的通信
 * @param {string} action - API 操作類型，如 getTasks, saveTask 等
 * @param {Object} params - 要傳送的參數物件
 * @returns {Promise<Object>} - 返回 API 回應的 Promise 物件
 */
async function callAPI(action, params = {}) {
  // 構建 URL 查詢參數，將 action 轉為 do 參數，與其他參數合併
  const queryParams = new URLSearchParams({ do: action, ...params });
  const url = `${API_URL}?${queryParams}`;

  try {
    // 使用 fetch API 發送請求，等待回應
    const response = await fetch(url);
    // 將回應解析為 JSON
    const data = await response.json();
    return data;
  } catch (error) {
    // 如果發生錯誤，記錄到控制台並返回錯誤狀態
    console.error("API 呼叫失敗:", error);
    return { status: false, message: "連接失敗" };
  }
}

// DOM 完全載入後執行初始化
// 註冊了一個事件監聽器，等到 HTML 文檔加載完成後（DOM 結構已經建立）
// 執行裡面的回調函數，保證所有需要操作的 DOM 元素都已經存在。
document.addEventListener("DOMContentLoaded", async function () {
  // 獲取頁面中的主要 DOM 元素
  // 使用 getElementById 取得表單、輸入欄位、日期欄位、任務列表和空狀態提示元素。
  const taskForm = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const dateInput = document.getElementById("date-input");
  taskList = document.getElementById("task-list");
  emptyState = document.getElementById("empty-state");

  // 設置今天的日期為預設值
  const today = new Date();
  // toISOString() 將日期轉成 ISO 格式 (如: 2023-12-10T08:00:00.000Z)
  // slice(0, 10) 取出前10個字符，即 YYYY-MM-DD 格式
  const formattedDate = today.toISOString().slice(0, 10);
  dateInput.value = formattedDate;

  // 在 DOM 加載完成後立即調用 loadTasks()
  // 目的是從 GAS 中讀取已存的任務並將它們顯示出來
  // 使用 await 確保任務載入完成後再進行後續操作
  await loadTasks();

  // 初始化拖曳排序功能 - 讓用戶可以拖動任務改變優先順序
  initSortable();

  // 監聽表單提交事件 - 用於新增任務
  taskForm.addEventListener("submit", async function (e) {
    // 阻止表單的預設提交行為，避免頁面刷新
    e.preventDefault();

    // 獲取並驗證輸入的任務文本和日期
    const taskText = taskInput.value.trim();
    const taskDate = dateInput.value;

    // 檢查任務文本和日期是否有效
    if (taskText && taskDate) {
      // 呼叫添加任務函數，等待完成
      await addTask(taskText, taskDate);

      // 清空輸入欄位，準備添加下一個任務
      taskInput.value = "";
      dateInput.value = formattedDate;

      // 重新聚焦到任務輸入欄位，提升用戶體驗
      taskInput.focus();
    }
  });
});

/**
 * 新增任務函數 - 創建新任務並保存到資料庫
 * @param {string} text - 任務文本描述
 * @param {string} date - 任務日期 (YYYY-MM-DD 格式)
 */
async function addTask(text, date) {
  // 創建任務對象 - 包含所有任務相關信息
  const task = {
    id: Date.now(), // 使用當前時間戳作為唯一ID，確保不重複
    text: text, // 任務描述文本
    date: date, // 任務日期
    completed: false, // 初始狀態為未完成
  };

  // 通過 API 添加到 GAS 資料庫，等待保存結果
  const result = await saveTask(task);

  // 根據保存結果決定後續操作
  if (result.status) {
    // 保存成功，在頁面上創建任務元素
    createTaskElement(task);
    // 更新空狀態提示的顯示/隱藏
    updateEmptyState();
  } else {
    // 保存失敗，顯示錯誤信息
    alert("保存任務失敗：" + result.message);
  }
}

/**
 * 創建任務DOM元素函數 - 將任務數據轉換為頁面上的 DOM 元素
 * @param {Object} task - 任務物件，包含 id, text, date, completed 屬性
 */
function createTaskElement(task) {
  // 檢查任務列表容器是否存在
  if (!taskList) {
    console.error("taskList 未定義");
    return;
  }

  // 創建任務列表項目元素
  const taskItem = document.createElement("li");
  taskItem.classList.add("task-item");
  taskItem.dataset.id = task.id; // 將任務ID保存為自定義數據屬性

  // 創建任務內容容器
  const taskContent = document.createElement("div");
  taskContent.classList.add("task-content");

  // 創建勾選框 - 用於標記任務完成狀態
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.classList.add("task-checkbox");
  checkbox.checked = task.completed; // 根據任務完成狀態設置勾選

  // 創建任務文本元素
  const taskText = document.createElement("span");
  taskText.classList.add("task-text");
  taskText.textContent = task.text;

  // 如果任務已完成，添加視覺樣式（刪除線和灰色）
  if (task.completed) {
    taskText.style.textDecoration = "line-through";
    taskText.style.color = "#999";
  }

  // 創建任務日期元素並格式化顯示
  const taskDate = document.createElement("span");
  taskDate.classList.add("task-date");
  taskDate.textContent = formatDate(task.date); // 使用自定義函數格式化日期

  // 創建任務操作按鈕容器
  const taskActions = document.createElement("div");
  taskActions.classList.add("task-actions");

  // 創建編輯按鈕
  const editBtn = document.createElement("button");
  editBtn.classList.add("edit-btn");
  editBtn.textContent = "編輯";

  // 創建刪除按鈕
  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("delete-btn");
  deleteBtn.textContent = "刪除";

  // 組合 DOM 結構 - 先構建內部元素再添加到外部容器
  taskContent.appendChild(checkbox);
  taskContent.appendChild(taskText);
  taskContent.appendChild(taskDate);

  taskActions.appendChild(editBtn);
  taskActions.appendChild(deleteBtn);

  taskItem.appendChild(taskContent);
  taskItem.appendChild(taskActions);

  // 將完成的任務項目添加到任務列表容器
  taskList.appendChild(taskItem);

  // === 為各元素添加事件監聽器 ===

  // 勾選框狀態變更事件 - 切換任務完成狀態
  checkbox.addEventListener("change", function () {
    // 更新後端數據庫中的完成狀態
    toggleTaskComplete(task.id, this.checked);
    // 更新前端顯示樣式
    taskText.style.textDecoration = this.checked ? "line-through" : "none";
    taskText.style.color = this.checked ? "#999" : "#000";
  });

  // 刪除按鈕點擊事件
  deleteBtn.addEventListener("click", function () {
    // 二次確認，避免誤刪
    if (confirm("確定要刪除這個任務嗎？")) {
      // 刪除資料庫中的任務
      removeTask(task.id);
      // 從 DOM 中移除任務元素
      taskItem.remove();
      // 更新空狀態提示
      updateEmptyState();
    }
  });

  // 編輯按鈕點擊事件
  editBtn.addEventListener("click", function () {
    // 彈出對話框讓用戶輸入新的任務內容
    const newText = prompt("編輯任務:", task.text);
    // 驗證用戶輸入，確保不為空
    if (newText !== null && newText.trim() !== "") {
      // 更新前端顯示
      taskText.textContent = newText;
      // 更新後端數據庫
      updateTask(task.id, newText, task.date, task.completed);
    }
  });
}

/**
 * 保存任務到 GAS 資料庫
 * @param {Object} task - 要保存的任務對象
 * @returns {Promise<Object>} - API 回應結果
 */
async function saveTask(task) {
  // 呼叫 API 保存任務，注意將布林值轉為字符串以便 URL 參數傳遞
  return await callAPI("saveTask", {
    id: task.id.toString(),
    text: task.text,
    date: task.date,
    completed: task.completed.toString(),
  });
}

/**
 * 從 GAS 資料庫獲取所有任務
 * @returns {Promise<Array>} - 包含所有任務的數組
 */
async function getTasks() {
  // 呼叫 API 獲取所有任務
  const response = await callAPI("getTasks");
  // 如果成功則返回數據，否則返回空數組
  return response.status ? response.data : [];
}

/**
 * 從 GAS 資料庫載入任務並渲染到頁面
 * 這是應用程序初始化時的關鍵函數
 */
async function loadTasks() {
  // 獲取所有任務數據
  const tasks = await getTasks();

  // 根據任務數量決定是否顯示空狀態提示
  if (tasks.length > 0) {
    emptyState.style.display = "none"; // 有任務時隱藏提示
  } else {
    emptyState.style.display = "flex"; // 無任務時顯示提示
  }

  // 清空現有任務列表，避免重複顯示
  taskList.innerHTML = "";

  // 遍歷所有任務並創建對應的 DOM 元素
  tasks.forEach((task) => {
    // 確保數據類型正確 - 特別是從字符串轉換為適當的類型
    task.id = Number(task.id); // ID 應為數字
    // completed 可能是字符串 "true"/"false" 或布林值，統一轉換為布林值
    task.completed = task.completed === "true" || task.completed === true;
    // 創建並添加任務元素到頁面
    createTaskElement(task);
  });
}

/**
 * 初始化拖曳排序功能
 * 使用 Sortable.js 庫實現任務項目的拖拽重新排序
 */
function initSortable() {
  // 確保任務列表元素存在
  if (!taskList) {
    console.error("taskList 未定義，無法初始化排序功能");
    return;
  }

  // 檢查 Sortable 庫是否已加載
  if (typeof Sortable !== "undefined") {
    // 創建 Sortable 實例，配置拖曳行為
    Sortable.create(taskList, {
      animation: 150, // 拖動時的動畫效果，數值代表動畫時間（毫秒）
      handle: ".task-content", // 指定拖動把手，只有點擊此元素才能拖動
      ghostClass: "sortable-ghost", // 拖動時的占位元素樣式類
      chosenClass: "sortable-chosen", // 被選中元素的樣式類
      dragClass: "sortable-drag", // 正在拖動的元素樣式類
      onEnd: function (evt) {
        // 拖曳結束後，更新資料庫中的任務順序
        updateTaskOrder();
      },
    });
  } else {
    // 如果 Sortable 庫未載入，記錄錯誤
    console.error("Sortable 庫未加載，請確保已經引入 Sortable.js");
  }
}

/**
 * 在 GAS 資料庫中更新任務
 * @param {number} id - 任務 ID
 * @param {string} text - 任務文本
 * @param {string} date - 任務日期
 * @param {boolean} completed - 完成狀態
 * @returns {Promise<Object>} - API 回應結果
 */
async function updateTask(id, text, date, completed) {
  // 呼叫 API 更新指定任務的資料
  return await callAPI("updateTask", {
    id: id.toString(),
    text: text,
    date: date,
    completed: completed.toString(),
  });
}

/**
 * 切換任務完成狀態
 * @param {number} id - 任務 ID
 * @param {boolean} completed - 新的完成狀態
 */
async function toggleTaskComplete(id, completed) {
  // 獲取當前任務列表
  const tasks = await getTasks();
  // 找到要更新的任務
  const task = tasks.find((t) => Number(t.id) === id);

  // 如果找到任務，則更新其完成狀態
  if (task) {
    await updateTask(id, task.text, task.date, completed);
  }
}

/**
 * 從 GAS 資料庫移除任務
 * @param {number} id - 要刪除的任務 ID
 * @returns {Promise<Object>} - API 回應結果
 */
async function removeTask(id) {
  // 呼叫 API 刪除指定 ID 的任務
  return await callAPI("removeTask", {
    id: id.toString(),
  });
}

/**
 * 更新空狀態提示的可見性
 * 根據是否有任務來顯示或隱藏「沒有任務」的提示
 */
async function updateEmptyState() {
  // 獲取當前任務列表
  const tasks = await getTasks();
  // 根據任務數量設置空狀態提示的顯示樣式
  // 三元運算符：如果有任務則隱藏提示，否則顯示提示
  emptyState.style.display = tasks.length > 0 ? "none" : "flex";
}

/**
 * 格式化日期顯示
 * @param {string} dateString - ISO 格式的日期字符串 (YYYY-MM-DD)
 * @returns {string} - 本地化格式的日期字符串 (例如：2023年12月10日)
 */
function formatDate(dateString) {
  // 設置日期格式化選項
  const options = { year: "numeric", month: "long", day: "numeric" };
  // 將日期字符串轉換為 Date 對象，並格式化為本地日期字符串
  return new Date(dateString).toLocaleDateString("zh-TW", options);
}

/**
 * 更新任務順序
 * 當用戶拖曳重新排序任務後，將新的順序保存到資料庫
 * @returns {Promise<Object>} - API 回應結果
 */
async function updateTaskOrder() {
  // 獲取當前 DOM 中任務元素的順序
  const taskItems = Array.from(taskList.querySelectorAll(".task-item"));
  // 從 DOM 元素中提取任務 ID，形成新的順序數組
  const taskIds = taskItems.map((item) => item.dataset.id);

  // 呼叫 API 更新資料庫中的任務順序
  return await callAPI("updateOrder", {
    ids: JSON.stringify(taskIds), // 將 ID 數組轉換為 JSON 字符串
  });
}
