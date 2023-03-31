<template>
  <h1>Image to Base64</h1>
  <el-upload :auto-upload="false" class="upload-demo" :before-upload="beforeupload" :show-file-list="false" :on-change="change">
    <el-button type="primary">upload</el-button>
  </el-upload>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

<script lang="ts" setup>
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { UploadProps, UploadUserFile } from "element-plus";

import { writeText, readText } from "@tauri-apps/api/clipboard";

const writeData = async (data) => {
  ElMessage.success("转换成功，直接粘贴吧~ ");
  await writeText(data);
};

const fileList = ref([]);

function image2Base64(img) {
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, img.width, img.height);
  var dataURL = canvas.toDataURL("image/png");
  return dataURL;
}

const change = (file) => {
  console.log(file, "123");
  if (file.raw.type.indexOf("image") === -1) {
    ElMessage.error("请上传图片");
    return;
  }
  let reader = new FileReader();
  reader.readAsDataURL(file.raw);
  reader.onload = async (e) => {
    var image = new Image();
    image.src = e.target.result;
    image.onload = (imgEvent) => {
      let data = image2Base64(imgEvent.target);
      console.log(data, "asdas");
      writeData(data);
    };
  };
};
</script>
