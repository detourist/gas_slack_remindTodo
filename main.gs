function remindTodoInSlack(){
  //GASスクリプトプロパティ
  const scriptProperty = PropertiesService.getScriptProperties().getProperties();
  //Slack APIトークン
  const token = scriptProperty.SLACK_TOKEN;
  
  //自分（bot）がメンバーになっているチャンネルを取得
  var channels = get_my_channels(token);
  
  //チャンネル毎に、ToDoの取得＆リマインドの投稿を実行
  for (var i = 0; i < channels.length; i++){
    var channelId = channels[i].id;

    Logger.log("//////// main ////////");
    Logger.log("channels["+ i +"].id="+ channelId);
    
    get_todo_and_post_remind(channelId, token);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function get_todo_and_post_remind(channelId, token){
  //チャンネルのToDoの取得＆リマインドの投稿を実行
  //【API】
  // https://api.slack.com/methods/channels.history
  // https://api.slack.com/methods/chat.getPermalink
  // https://api.slack.com/methods/chat.postMessage
  
  //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  //取得するメッセージ数（1～1000）
  //対象メッセージが1000件を超える場合は、paginationを使用するように要改修
  const count = 1000;
  //メッセージを抜き出す最大文字数
  const textLength = 20;
  //Slack投稿時の名前
  const botName = "ToDoリマインド";
  //Slack投稿時のアイコン
  const botIcon = ":todo:";
  //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    
  //メッセージを取得
  var url ="https://slack.com/api/channels.history";
  url += "?token=" + token;
  url += "&channel=" + channelId;
  url += "&count=" + count;
  Logger.log("//////// channels.history ////////");
  Logger.log(url);
  
  var response = UrlFetchApp.fetch(url);
  var data = JSON.parse(response.getContentText());
  var messages = data.messages;
  //Logger.log(messages);
  
  
  //TodDoデータを生成
  //メッセージ×todoリアクションをしたユーザのテーブル
  var todoData = [];
  //ユニークユーザリスト
  var todoUsers = [];
  
  //messages配列を処理
  for(var i = 0; i < messages.length; i++){
    //リアクションが付いている場合
    if(messages[i].reactions){
      //reactions配列を処理
      for(var j = 0; j < messages[i].reactions.length; j++){
        //todoのリアクションである場合
        if(messages[i].reactions[j].name == "todo"){
          //reactionを付けたusersの配列を処理
          for(var k = 0; k < messages[i].reactions[j].users.length; k++){
            //todoリアクションを付けたユーザ
            var user = messages[i].reactions[j].users[k];
            
            //ToDoデータ配列にPush
            todoData.push({
              user: user,
              text: messages[i].text,
              ts: messages[i].ts
            });
            
            //ユーザがユニークユーザリストに存在していない場合
            if(todoUsers.indexOf(user) == -1){
              //ユニークユーザリストにPush
              todoUsers.push(user);
            }
          }
        }
      }
    }
  }
  Logger.log("//////// todoData ////////");
  Logger.log(todoData);
  Logger.log("//////// todoUsers ////////");
  Logger.log(todoUsers);

  //todoDataが存在する場合
  if(todoData.length > 0){
  
    //投稿データを生成
    var postData = [];
    postData.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "※過去"+ count +"件より古いメッセージに付けられているToDoは対象外です"
      }
    });
    
    //ユニークユーザ配列を処理
    for(var i = 0; i < todoUsers.length; i++){
      
      //対象ユーザ
      var userId = todoUsers[i];
      var userInfo = get_user_info(userId, token);
      var userName = userInfo.name;
      Logger.log("//////// user ////////");
      Logger.log("userName="+ userName);
      
      //投稿テキストを生成
      var postText = "*"+ userName +"*\n";
      
      //ToDoデータ配列のうち、ユーザが対象ユーザのデータのみ抽出
      var todos = todoData.filter(function(item, index){
        if(item.user == userId) return true;
      });
      Logger.log("//////// todos ////////");
      Logger.log(todos);
      
      //対象ユーザのToDo配列を処理
      for(var j = 0; j < todos.length; j++){
        
        //メッセージのPermalinkを取得
        //【API】
        // https://api.slack.com/methods/chat.getPermalink
        //【Limit】
        // hundreds of requests per minute
        
        var url ="https://slack.com/api/chat.getPermalink";
        url += "?token=" + token;
        url += "&channel=" + channelId;
        url += "&message_ts=" + todos[j].ts;
        Logger.log("//////// chat.getPermalink ////////");
        Logger.log(url);
        
        var response = UrlFetchApp.fetch(url);
        sleep(600);
        var data = JSON.parse(response.getContentText());
        var link = data.permalink;
        Logger.log(link);
        
        
        //投稿テキストの加工
        var text = String(todos[j].text);
        
        //メンション・URLを削除
        text = text.replace(/<[^<>]*>/gm, '');
        Logger.log("//////// text ////////");
        Logger.log("text="+ text);
        
        //改行を削除
        text = text.replace(/\r?\n/g, '');
        Logger.log("text="+ text);
        
        //トリム
        text = text.trim();
        Logger.log("text="+ text);
        
        //最長文字数にカット
        if(text.length > textLength){
          text = text.substring(0, textLength);
          text += "...";
        }
        Logger.log("text="+ text);
        
        //箇条書き＋リンク付与
        postText += "- "+ text +" <"+ link +"|[link]>\n";
      }
      Logger.log("//////// postText ////////");
      Logger.log(postText);
      
      //Blockを追加
      postData.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": postText
        }
      });
    }
    Logger.log("//////// postData ////////");
    Logger.log(postData);
    
    
    //投稿内容
    var options = 
        {
          "method" : "POST",
          "payload" : 
          {
            "token": token,
            "username" : botName,
            "icon_emoji" : botIcon,
            "channel" : channelId,
            "blocks" : JSON.stringify(postData)
          }
        }
    Logger.log("//////// options ////////");
    Logger.log(options);
    
    // 投稿実行
    //【API】
    // https://api.slack.com/methods/chat.postMessage
    //【Limit】
    // Posting messages    1 per second    short bursts >1 allowed
    
    var response = UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", options);
    sleep(1000);
    Logger.log("//////// chat.postMessage ////////");
    Logger.log(response);

  }else{
    Logger.log("!!!! todoData is Empty !!!!");
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function get_my_channels(token){
  // チャンネルを取得
  //【API】
  // https://api.slack.com/methods/conversations.list

  //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  //取得するチャンネル数（1～1000）
  //publicチャンネルは、自分（bot）が参加していないものも含まれる
  //対象チャンネルが1000件を超える場合は、paginationを使用するように要改修
  const limit = 1000;
  //::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    
  //チャンネルを取得
  //アーカイブされたチャンネルを除く、publicとprivateを含む
  var url ="https://slack.com/api/conversations.list";
  url += "?token=" + token;
  url += "&exclude_archived=true";
  url += "&limit=" + limit;
  url += "&types=public_channel,private_channel";
  Logger.log("//////// conversations.list ////////");
  Logger.log(url);
  
  var response = UrlFetchApp.fetch(url);
  sleep(1000);
  var data = JSON.parse(response.getContentText());
  //Logger.log(data);
  
  //自分（bot）がメンバーになっているチャンネルのみ抽出
  var channels = data.channels.filter(function(item, index){
    if(item.is_member === true) return true;
  });
  //Logger.log(channels);
  
  return channels;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function get_user_info(userId, token){
  // ユーザ情報を取得
  //【API】
  // https://api.slack.com/methods/users.info
  
  //ユーザ情報を取得
  var url ="https://slack.com/api/users.info";
  url += "?token=" + token;
  url += "&user=" + userId;
  Logger.log("//////// users.info ////////");
  Logger.log(url);
  
  var response = UrlFetchApp.fetch(url);
  sleep(1000);
  var data = JSON.parse(response.getContentText());
  //Logger.log(data);
    
  return data.user;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function sleep(ms){
  var dt1 = new Date().getTime();
  var dt2 = new Date().getTime();
  while(dt2 < dt1 + ms){
    dt2 = new Date().getTime();
  }
  return;
}
