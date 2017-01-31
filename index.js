const { writeFileSync, createWriteStream } = require("fs");
const { wrap } = require("co");
const request = require("superagent");
const toPinyin = require("pinyin");
const binaryParser = require("superagent-binary-parser");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

const countries = [{
  name: "中国",
  code: "0_0-0.0_0.0-0-0-0-0-0-1-0-0"
}, {
  name: "德国",
  code: "0_0-0.0_0.0-0-0-0-0-0-2-0-0"
}, {
  name: "日本",
  code: "0_0-0.0_0.0-0-0-0-0-0-3-0-0"
}, {
  name: "美国",
  code: "0_0-0.0_0.0-0-0-0-0-0-4-0-0"
}, {
  name: "韩国",
  code: "0_0-0.0_0.0-0-0-0-0-0-5-0-0"
}, {
  name: "法国",
  code: "0_0-0.0_0.0-0-0-0-0-0-6-0-0"
},{
  name: "英国",
  code: "0_0-0.0_0.0-0-0-0-0-0-7-0-0"
}, {
  name: "意大利",
  code: "0_0-0.0_0.0-0-0-0-0-0-8-0-0"
}, {
  name: "瑞典",
  code: "0_0-0.0_0.0-0-0-0-0-0-9-0-0"
}, {
  name: "荷兰",
  code: "0_0-0.0_0.0-0-0-0-0-0-10-0-0"
}, {
  name: "捷克",
  code: "0_0-0.0_0.0-0-0-0-0-0-11-0-0"
}, {
  name: "西班牙",
  code: "0_0-0.0_0.0-0-0-0-0-0-12-0-0"
}];
const uri = "http://www.autohome.com.cn/car/";
// 根据现在链接排重
const hasDownloads = [];

const createNonceStr = () => Math.random().toString(36).substr(2, 15);
const createRandomName = (str = Date.now() + "") => {
  str = str + createNonceStr();
  return shuffle(str.split("")).join("");
};
/**
 * 获取html 并转码
 */
const getHTML = uri => {
  return new Promise((resolve, reject) => {
    const req = request
      .get(uri)
      .parse(binaryParser)
      .end((err, res) => {
        if (err || !res.ok) {
          console.log('get html error!');
          reject(err);
        } else {
          const html = iconv.decode(res.body, "GB2312");
          resolve(html);
        }
      });
  });
};

(wrap(function*(){
  console.log('start......');
  let result = [];
  let id = 1;
  try {
    for (let countrie of countries) {
      const dom = yield getHTML(`${uri}${countrie.code}/`);
      const $ = cheerio.load(dom);
      let item = $("#tab-content>.tab-content-item").eq(0);
      item = item.find(".uibox").get();
      console.log("------------------------", countrie.name, item.length)
      // 第一重循环 获取首字母
      for (let element1 of item) {
        const letter = $(element1).find(".font-letter").text().trim();
        const brands = $(element1).find(".uibox-con>dl").get();
        // 第二重循环 获取品牌
        for (let element2 of brands) {
          // 获取品牌名称
          const brand = $(element2).find("dt>div").text().trim();
          const types = $(element2).find("dd>ul>li>h4").get();
          const pinyin = toPinyin(brand, {
             style: toPinyin.STYLE_NORMAL
          }).join("").toLowerCase();
          const label = countrie.name + brand + pinyin;
          result.push({ 
            id, 
            label, 
            countrie: countrie.name, 
            letter, 
            pinyin, 
            name: brand, 
            parent_id: null });
          const parent_id = id;
          id ++;
          // 第三重循环 获取车型
          for (let element3 of types) {
            const type = $(element3).text();
            const pinyin = toPinyin(type, {
                style: toPinyin.STYLE_NORMAL
              }).join("").toLowerCase();
            result.push({ 
              id,
              label: label + type + pinyin,
              countrie: countrie.name, 
              letter: toPinyin(type, {
                style: toPinyin.STYLE_FIRST_LETTER
              })[0][0].toUpperCase().charAt(0), 
              pinyin,
              name: type, 
              parent_id });
            id ++;
          }
        }
      }
    }
    writeFileSync("./car_type.json", JSON.stringify(result));
    console.log('completed!');
  } catch (error) {
    console.log(error);
  }
}))();