# gas_slack_remindTodo

## 使用例

1. 任意のメッセージに「ToDo」リアクションを付ける
<img width="1000" alt="slact_remaindTodo_main" src="https://user-images.githubusercontent.com/11507547/71308118-b9607c00-243b-11ea-9e3c-805d74ea22ab.png">

2. Scriptを実行するとリマインドが投稿される
    - ※リマインド本文中の[link]をクリックすると元メッセージに移動
<img width="1000" alt="slact_remaindTodo_post" src="https://user-images.githubusercontent.com/11507547/71308130-d8f7a480-243b-11ea-9387-2586a0f1b519.png">


## 注意事項

- APIトークンの取り扱いには十分注意してください。
    - プライベートチャンネルにBotを参加させると、GASプロジェクトの管理者（APIトークンを知っている人）が、チャンネル内の会話を閲覧できるようになります。
- APIの利用制限（Rate Limit）に従うため、各所にsleepを設定しています。
    - 現在の設定値は適当です。
- リマインドの投稿を箇条書きにするため、1メッセージあたりの最大文字数（textLength）を定義し、メッセージ本文がこの文字数を超えている場合はカットしています。
    - ただし、カット処理は簡易実装のため、URLの途中で途切れたり、絵文字や書式が無効になる場合があります。
- 2019/12/21現在、投稿内容の箇条書きのフォーマットが反映されません。（ただのハイフンになる）


## 設定手順

1. SlackのBotを作成し、APIトークンキーを取得
2. ToDoリマインドを実行したいチャンネル（Public、Privateどちらも可）に、Botアプリを追加
3. GASプロジェクトを作成（このコードをコピー）
4. GASプロジェクトのプロパティを設定
    - ファイル＞プロジェクトのプロパティ＞スクリプトのプロパティ
        - プロパティ：  SLACK_TOKEN
        - 値：         BotアプリのAPIトークンキー
5. GASプロジェクトのトリガーを設定
    - 編集＞現在のプロジェクトのトリガー＞トリガーを追加
         - 実行する関数：               remindTodoInSlack()


## Reference

- https://tech.basicinc.jp/articles/152
- http://blog.livedoor.jp/sasata299/archives/52285500.html
