const url = window.location.href;
const regex = /([^&=]+)=([^&]*)/g;
const urlWithoutHtml = window.location.origin;
const params = {};
let m;
while ((m = regex.exec(location.href))) {
  params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
}
if (Object.keys(params).length) {
  localStorage.setItem("authInfo", JSON.stringify(params));
}

let info = JSON.parse(localStorage.getItem("authInfo"));
let email = "";

fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
  headers: {
    Authorization: `Bearer ${info["access_token"]}`,
  },
})
  .then((response) => response.json())
  .then((data) => {
    email = data.email;
    fetch(
      "https://stunning-capybara-1efe1a.netlify.app/.netlify/functions/api/users",
      // "http://localhost:3001/api/user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          image_url: data.picture,
        }),
      }
    );

    document.getElementById("name").innerHTML += data.name;
    document.getElementById("image").setAttribute("src", data.picture);
  });

async function logout() {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${info["access_token"]}`,
      {
        method: "POST",
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
        },
      }
    );
    localStorage.removeItem("authInfo");
    location.href = `${urlWithoutHtml}/index.html`;
  } catch (error) {
    console.error(error);
  }
}

const videos = document.querySelector("#videos");
const videoDb = document.querySelector("#video-db");

const search = document.querySelector("#search");
search.addEventListener("click", () => {
  const txtCajita = document.querySelector("#txtCajita");
  searchVideos(txtCajita.value);
});

// http://localhost:3001/api/video/alksdmf
// thats search a video like in the db
function searchVideos(q = "") {
  const resultContainer = document.getElementById("app");
  // const apiUrl = `http://localhost:3001/api/video/search/${q}`;
  const apiUrl = `https://stunning-capybara-1efe1a.netlify.app/.netlify/functions/api/videos/search/${q}`;

  fetch(apiUrl)
    .then((res) => res.json())
    .then(({ data }) => {
      console.log(data);
      resultContainer.innerHTML = generateTableHTML(data);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      resultContainer.innerHTML = generateErrorAlert();
    });
}

function generateTableHTML(data) {
  if (!data.length) {
    return generateErrorAlert("No se encontraron videos con esa etiqueta");
  }

  return `
    <table class="table table-hover">
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Drive</th>
          <th scope="col">Subido por</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody id="result">
        ${generateRowsHTML(data)}
      </tbody>
    </table>`;
}

function generateRowsHTML(data) {
  return data
    .filter(({ videoDetails }) => videoDetails && videoDetails.length > 0)
    .map(({ videoDetails, user_name }) => {
      const { title, url } = videoDetails[0];
      return `
        <tr>
          <th scope="row">${title}</th>
          <td><a target="_blank" href="https://drive.google.com/file/d/${url}">${title}</a></td>
          <td><p>${user_name}</p></td>
          <td><button class="btn btn-primary" onclick="setVideo('${urlWithoutHtml}', '${url}', '${title}', '${user_name}')">Ver</button></td>
        </tr>`;
    })
    .join("");
}

function generateErrorAlert(
  message = "No se encontraron videos con esa etiqueta"
) {
  return `<div class="alert alert-danger" role="alert">${message}</div>`;
}

let result = document.querySelector("#result");
const app = document.querySelector("#app");
const ACCESS_TOKEN = info["access_token"];

// Check if there is session storage
if (sessionStorage.getItem("gDriveFiles")) {
  const files = JSON.parse(sessionStorage.getItem("gDriveFiles"));
  app.innerHTML = `
    <table class="table table-hover">
      <thead>
        <tr>
          <th scope="col"></th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody id="result"></tbody>
    </table>
  `;
  result = document.querySelector("#result");
  files.forEach((file) => {
    result.innerHTML += `
      <tr>
        <th scope="row">${file.name}</th>
        <td><a target="_blank" href="https://drive.google.com/file/d/${file.id}">${file.name}</a></td>
        <td><button class="btn btn-primary" onclick="setVideo('${urlWithoutHtml}', '${file.id}', '${file.name}')">Ver</button></td>
      </tr>
    `;
  });
}

function searchFiles(q = "") {
  app.innerHTML = "";

  fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=50&supportsAllDrives=true&fields=files(name,id,mimeType)`,
    {
      method: "GET",
      headers: new Headers({ Authorization: "Bearer " + ACCESS_TOKEN }),
    }
  )
    .then((res) => res.json())
    .then(({ files: valFiles }) => {
      videos.removeAttribute("disabled", "");
      app.innerHTML = `
        <table class="table table-hover">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody id="result"></tbody>
        </table>
      `;
      const result = document.querySelector("#result");

      // save in session storage
      sessionStorage.setItem("gDriveFiles", JSON.stringify(valFiles));

      valFiles.forEach(({ id, name }) => {
        result.innerHTML += `
          <tr>
            <th scope="row">${name}</th>
            <td>
              <a target="_blank" href="https://drive.google.com/file/d/${id}">${name}</a>
            </td>
            <td>
              <button class="btn btn-primary" onclick="setVideo('${urlWithoutHtml}', '${id}', '${name}')">Ver</button>
            </td>
          </tr>
        `;
      });
    });
}

function getVideos() {
  searchFiles("mimeType contains 'video/'");
  videos.setAttribute("disabled", "");
  app.innerHTML = `
    <div class="d-flex justify-content-center">
      <div class="spinner-border text-primary" role="status">
      </div>
    </div>
  `;
}

function setVideo(url, id, fileName, userName) {
  console.log("click", url, id, fileName, userName);
  let views = 0;
  if (!userName) {
    fetch(
      `https://stunning-capybara-1efe1a.netlify.app/.netlify/functions/api/users/`
      // `http://localhost:3001/api/user/`
    )
      .then((res) => res.json())
      .then(({ data }) => {
        console.log(data);
        const user = data.find((user) => user.email === email);
        if (user) userName = user.name;
        setVideo(url, id, fileName, userName);
      });
    return;
  }
  localStorage.setItem(
    "videoInfo",
    JSON.stringify({ name: fileName, email, user_name: userName, views })
  );
  location.href = `${url}/player.html?id=${id}`;
}

function getVideosDB() {
  fetch(
    "https://stunning-capybara-1efe1a.netlify.app/.netlify/functions/api/videos/"
    // "http://localhost:3001/api/video"
  )
    .then((res) => res.json())
    .then(({ data }) => {
      app.innerHTML = `
        <table class="table table-hover">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Drive</th>
              <th scope="col">Subido por</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody id="result"></tbody>
        </table>
      `;
      const result = document.querySelector("#result");
      data.forEach(({ title, url, user_name }) => {
        result.innerHTML += `
          <tr>
            <th scope="row">${title}</th>
            <td><a target="_blank" href="https://drive.google.com/file/d/${url}">${title}</a>
            </td>
            <td>
              <p>${user_name}</p>
            </td>
            <td>
              <button class="btn btn-primary" onclick="setVideo('${urlWithoutHtml}', '${url}', '${title}', '${user_name}')">Ver</button>
            </td>
          </tr>
        `;
      });
    });
}
videos.addEventListener("click", getVideos);
videoDb.addEventListener("click", getVideosDB);
