let records = [];

// 电子围栏中心点：这里先假设为安全活动区域中心
const fenceCenter = {
  latitude: 35.999704,
  longitude: 120.125205,
};

// 电子围栏半径，单位：米
const fenceRadius = 2000;

// 页面打开后，读取本地保存的数据
window.onload = function () {
  const savedRecords = localStorage.getItem("zhihuYituRecords");

  if (savedRecords) {
    records = JSON.parse(savedRecords);
  }

  renderPage();
};

// 接收终端数据
function receiveDeviceData() {
  const data = {
    time: new Date().toLocaleString(),
    deviceId: document.getElementById("deviceId").value,
    latitude: Number(document.getElementById("latitude").value),
    longitude: Number(document.getElementById("longitude").value),
    battery: Number(document.getElementById("battery").value),
    temperature: Number(document.getElementById("temperature").value),
    humidity: Number(document.getElementById("humidity").value),
    status: document.getElementById("status").value
  };

  records.unshift(data);

  localStorage.setItem("zhihuYituRecords", JSON.stringify(records));

  renderPage();
}

// 生成一组终端测试数据
function generateDeviceData() {
  const statusList = ["normal", "normal", "normal", "fall", "help", "still", "offline"];
  const randomStatus = statusList[Math.floor(Math.random() * statusList.length)];

  const randomLatitude = fenceCenter.latitude + (Math.random() - 0.5) * 0.025;
  const randomLongitude = fenceCenter.longitude + (Math.random() - 0.5) * 0.025;

  document.getElementById("deviceId").value = "ESP32-001";
  document.getElementById("latitude").value = randomLatitude.toFixed(6);
  document.getElementById("longitude").value = randomLongitude.toFixed(6);
  document.getElementById("battery").value = Math.floor(Math.random() * 100);
  document.getElementById("temperature").value = (20 + Math.random() * 14).toFixed(1);
  document.getElementById("humidity").value = Math.floor(40 + Math.random() * 35);
  document.getElementById("status").value = randomStatus;
}

// 清空所有数据
function clearAllData() {
  const result = confirm("确认清空所有监护记录？");

  if (!result) {
    return;
  }

  records = [];
  localStorage.removeItem("zhihuYituRecords");
  renderPage();
}

// 渲染整个页面
function renderPage() {
  renderDashboard();
  renderOverview();
  renderTable();
}

// 渲染顶部状态卡片
function renderDashboard() {
  if (records.length === 0) {
    document.getElementById("deviceIdView").innerText = "--";
    document.getElementById("batteryView").innerText = "--";
    document.getElementById("statusView").innerText = "--";
    document.getElementById("riskView").innerText = "--";
    return;
  }

  const latest = records[0];
  const risk = judgeRisk(latest);

  document.getElementById("deviceIdView").innerText = latest.deviceId;
  document.getElementById("batteryView").innerText = latest.battery + "%";
  document.getElementById("statusView").innerText = translateStatus(latest.status);
  document.getElementById("riskView").innerText = risk.text;
}

// 渲染实时概览
function renderOverview() {
  if (records.length === 0) {
    document.getElementById("locationView").innerText = "暂无数据";
    document.getElementById("environmentView").innerText = "暂无数据";
    document.getElementById("timeView").innerText = "暂无数据";
    document.getElementById("fenceView").innerText = "暂无数据";
    return;
  }

  const latest = records[0];
  const distance = calculateDistance(
    latest.latitude,
    latest.longitude,
    fenceCenter.latitude,
    fenceCenter.longitude
  );

  const fenceText = distance > fenceRadius
    ? "已离开安全活动区域"
    : "处于安全活动区域内";

  document.getElementById("locationView").innerText =
    latest.latitude + ", " + latest.longitude;

  document.getElementById("environmentView").innerText =
    latest.temperature + "℃ / " + latest.humidity + "%RH";

  document.getElementById("timeView").innerText = latest.time;

  document.getElementById("fenceView").innerText =
    fenceText + "，距离中心点约 " + Math.round(distance) + " 米";
}

// 渲染数据表格
function renderTable() {
  const table = document.getElementById("dataTable");

  if (records.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="empty">暂无监护数据</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = "";

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const risk = judgeRisk(item);

    table.innerHTML += `
      <tr>
        <td>${item.time}</td>
        <td>${item.deviceId}</td>
        <td>${item.latitude}, ${item.longitude}</td>
        <td>${item.battery}%</td>
        <td>${item.temperature}℃ / ${item.humidity}%RH</td>
        <td>${translateStatus(item.status)}</td>
        <td>
          <span class="badge ${risk.className}">
            ${risk.text}
          </span>
        </td>
      </tr>
    `;
  }
}

// 风险判断
function judgeRisk(item) {
  const distance = calculateDistance(
    item.latitude,
    item.longitude,
    fenceCenter.latitude,
    fenceCenter.longitude
  );

  if (item.status === "fall") {
    return {
      text: "高风险：疑似跌倒",
      className: "badge-danger"
    };
  }

  if (item.status === "help") {
    return {
      text: "高风险：主动求助",
      className: "badge-danger"
    };
  }

  if (distance > fenceRadius) {
    return {
      text: "高风险：电子围栏越界",
      className: "badge-danger"
    };
  }

  if (item.status === "offline") {
    return {
      text: "中风险：设备离线",
      className: "badge-warning"
    };
  }

  if (item.status === "still") {
    return {
      text: "中风险：长时间静止",
      className: "badge-warning"
    };
  }

  if (item.battery < 20) {
    return {
      text: "中风险：电量过低",
      className: "badge-warning"
    };
  }

  return {
    text: "正常",
    className: "badge-normal"
  };
}

// 状态翻译
function translateStatus(status) {
  if (status === "normal") {
    return "正常";
  }

  if (status === "fall") {
    return "疑似跌倒";
  }

  if (status === "help") {
    return "主动求助";
  }

  if (status === "still") {
    return "长时间静止";
  }

  if (status === "offline") {
    return "设备离线";
  }

  return "未知状态";
}

// 计算两个经纬度点之间的距离，单位：米
function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;

  const radLat1 = lat1 * Math.PI / 180;
  const radLat2 = lat2 * Math.PI / 180;

  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}
