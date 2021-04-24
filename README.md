<div align="center" style="vertical-align: center;">
  <img alt="Slack" src="https://cdn.rpaka.dev/logo/slack.svg" height="80px" style="margin-right: 15px;" />
  <img alt="pakabot" src="https://cdn.rpaka.dev/icon/pakabot.png" height="80px" style="margin-right: 15px;" />
  <img alt="アイコン" src="https://cdn.rpaka.dev/icon/slack-unipa.png" height="80px" />
  <h1>UNIPA-Agent</h1>
  <h1>UNIPAエージェント</h1>
  <img alt="Node.js" src="https://cdn.rpaka.dev/logo/nodejs.svg" height="80px" style="margin-right: 15px;" />
  <img alt="Puppeteer" src="https://cdn.rpaka.dev/logo/puppeteer.svg" height="80px" />
</div>
<br>

![動作イメージ](https://cdn.rpaka.dev/useimage/slack-unipa/in-use.gif)

## 概要

日本システム技術株式会社の提供する大学向け学生支援システムである「[UNIVERSAL PASSPORT RX](https://www.jast-gakuen.com/rx/)」におけるデータの取得等をSlack/CLI経由で行えるようにする事を目指すものです。今のところ、**空き教室を調べる機能**と**未読の掲示を取得して既読としてマークする機能**しかつけていませんが今後何か新たに機能をつけるかもしれません。（頻繁に確認する項目から実装していくと思います。）

## 背景

UNIVERSAL PASSPORT (UNIPA) は大学のあらゆる情報が集められているサービスで頻繁に利用するものですが、いちいち操作するのは面倒なのでよく確認するデータについて自動化して楽したいと思い作りました。

## 利用

Slack Botとして作りましたがSlack Bot自体を公開する予定はありません。主に研究室内で使う予定です。というのも次の構成を見ると分かると思うのですが情報取得のたびにUNIPAにデータを取りに行ってるので、学内全体に公開とかしてアクセスが集中したらUNIPAのサーバに迷惑（自サーバからの過剰アクセス）がかかる為です。自分でサーバを用意してSlack Botを用意するか、ブラウザの自動操作の部分（`unipa.js`）や落としてきたファイルの解釈（`interpret.js`）とかを活用して普通にローカルで動くツールとして使ってもいいと思います。

## 構成

![構成](https://cdn.rpaka.dev/arch/slack-unipa.png)

UNIPAはブラウザで操作する事が前提のサービスとなっており、ページ毎にURLが固定でなくJSONを返すAPIが用意されているなんて事も当然ながらない（もしくは非公開）ので以下のように実際にブラウザ（Headless Chrome）を起動してPuppeteerで操作するという事を行っています。

![Puppeteerによる操作](https://cdn.rpaka.dev/useimage/slack-unipa/puppeteer.gif)

空き教室などUNIPAから落とせる情報はExcel形式で手に入るため、Excelを読むライブラリを用いて必要なデータを取り出してSlackで送るという事を行っています。実際にブラウザを動かすという事で情報が得られるまで時間がかかりますが、まあしょうがないか…。

### ファイル毎にだいたい書いてある内容

#### server.js - Slack Botとしてリクエストを受け付けたときの一連の処理の流れ

#### parse.js - 引数のパース

与えられた引数文字列（例: `1 9:00 10:00 C`）から形式に合っているか、開始時刻と終了時刻が逆になっていないかなどの論理不正の検証を行い、処理をしやすいように適切なオブジェクト（例: `9:00` -> `DateTime`オブジェクト）に変換するような処理が入っています。

#### buildMessage.js - 見やすいように文字として変換

Slackで応答するときなどでユーザに見やすいような文字表現への変換を行う処理が入っています。

#### unipa.js - ブラウザを起動してUNIPAを操作

PuppeteerによりHeadless Chromeで実際にUNIPAを操作する処理が入っています。

#### interpret.js - DLしたファイルから必要な情報を抽出

空き教室情報のxlsxファイルなどUNIPAからDLしたファイルから必要な情報を取り出す処理が入っています。

#### util.js

雑多な処理が入っています。

#### 

## 機能
### 空き教室の検索

あくまでUNIPAに登録されている情報を表示するだけなので、本当に空いているかは知らないです。指定された時間帯・建物で空いている教室とかぶっている予約を表示します。

---
`/searchuer [日付] [開始時刻] [終了時刻] [建物]`

**[日付] - 空いているか調べる日付 *<省略可能>***

> 日付は普通に"6/1"のように「月/日」にように指定するか、今日から数えて何日後かを数字で指定してください。0: 今日, 1: 明日 … といった具合です。これは省略が可能で省略した場合は[日付]は今日として扱います。

**[開始時刻] - 空いているか調べる時間帯の開始時刻**

**[終了時刻] - 空いているか調べる時間帯の終了時刻**

> 開始時刻・終了時刻は"12:00"のように「時:分」の形で指定します。

**[建物] - 空教室を探す建物**

> 建物に対応するように英数字をプログラム内で定義しています。

### 未読の掲示を取得して既読としてマーク

掲示板の未読の掲示のタイトルを取得して、未読の掲示全てを既読とします。掲示は個別に配信されている物もあるため、これはSlack BotとしてではなくCLIツールとして使うのを想定しています。引数は特にありません。

---

## 動作環境
- Node.js（検証：v13.13.0）
- ブラウザ: Google Chrome（Chroniumは不可）
- OS: Mac / Linux（検証：Mac OS X 10.15.5, Ubuntu | Windowsは未検証）

Chroniumでも動きますが、UNIPAの問題なのかファイルのダウンロードがうまく機能しません。

## 利用ライブラリ
- [dotenv](https://github.com/motdotla/dotenv)
- [express](https://github.com/expressjs/express)
- [body-parser](https://github.com/expressjs/body-parser)
- [smallwlns/slack](https://github.com/smallwins/slack)
- [luxon](https://github.com/moment/luxon)
- [puppeteer-core](https://github.com/puppeteer/puppeteer)
- [uuidjs/uuid](https://github.com/uuidjs/uuid)
- [lodash](https://github.com/lodash/lodash)
- [sheetjs](https://github.com/SheetJS/sheetjs) (Community Edition)

## 導入
### Slack Botとして導入

(1) Slack Appを作成してBotトークンを入手、スラッシュコマンドを指定。

* `/searchuer` - [FQDN]/ : 空き教室検索

(2) `.env.sample` を `.env` に改名して以下の項目を入力。

|項目|内容|
|---|---|
|APP_PORT|起動ポート|
|BOT_TOKEN|SlackのBotトークン|
|UNIPA_ID|UNIPAのID|
|UNIPA_PSWD|UNIPAのパスワード|
|CHROME_EXEC_PATH|Google Chromeの実行ファイルパス|
|DL_BASE_PATH|ファイルの一時保存先のパス|

(3) 起動する。

```bash
$ node server.js
```

### CLIツールとして導入

`cli.js` を使えばCLIツールとしても使えます。

(1) `.env.sample` を `.env` に改名して以下の項目を入力。

|項目|内容|
|---|---|
|APP_PORT|起動ポート|
|UNIPA_ID|UNIPAのID|
|UNIPA_PSWD|UNIPAのパスワード|
|CHROME_EXEC_PATH|Google Chromeの実行ファイルパス|
|DL_BASE_PATH|ファイルの一時保存先のパス|

(2) 利用する。

空き教室の検索

```bash
$ node cli.js emptyRooms 0 9:00 10:00 B
```

未読の掲示を取得

```bash
$ node cli.js unreadItems
```
