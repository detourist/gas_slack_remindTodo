function remindTodoInSlack() {
  //GASスクリプトプロパティ
  const scriptProperty = PropertiesService.getScriptProperties().getProperties();
  //Slack APIトークン
  const token = scriptProperty.SLACK_TOKEN;
  
  //自分（bot）が参加しているチャンネルを取得
  var channels = getMyChannels(token);
  
  //チャンネル毎に処理
  for (var i = 0; i < channels.length; i++){
    
    var channelId = channels[i].id;
    Logger.log("//////// channel ////////");
    Logger.log("channels["+ i +"], id="+ channelId);
    
    //ToDoの取得＆リマインドの投稿を実行
    doRemind(channelId, token);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function doRemind(channelId, token){
  //チャンネルのToDoの取得＆リマインドの投稿を実行
  //##########################################################################################################
  //検索対象とする（ToDoを意味する）リアクション絵文字の名前
  //※コロンは除く
  const reactionName = "todo";
  //取得するメッセージ数（最大値未確認）
  const limit = 1000;
  //1メッセージあたりの最大文字数（リマインドの投稿を箇条書きにするため、メッセージ本文がこの文字数を超えている場合はカットする）
  const textLength = 20;
  
  //リマインド投稿のフッター（context）に記載するテキスト
  const footerText = ":information_source: 最新"+ limit +"件より古いメッセージに付けられているToDoは対象外です";
  //リマインド投稿の本文中、ユーザ名（ToDoを持っている人）の前に付けるアイコン。不要な場合は「""」
  //※コロンを含める、後ろに半角スペースを含める
  const userIcon = ":bust_in_silhouette: ";
  //リマインド投稿時のbotの名前
  const botName = "ToDoリマインド";
  //リマインド投稿時のアイコン
  const botIcon = ":"+ reactionName +":";
  //##########################################################################################################
  
  //メッセージを取得
  //【API】
  // https://api.slack.com/methods/conversations.history
  //【Limit】
  // Web API Tier 3 : 50+ per minute
  //
  // ※channels.history APIは、Publicチャンネルにしか使用できない
  // https://api.slack.com/methods/channels.history

  var url ="https://slack.com/api/conversations.history";
  url += "?token=" + token;
  url += "&channel=" + channelId;
  url += "&limit=" + limit;
  Logger.log("//////// conversations.history ////////");
  Logger.log(url);
  
  var response = UrlFetchApp.fetch(url);
  sleep(1200);
  var data = JSON.parse(response.getContentText());
  Logger.log("response="+ (data.ok ? "{ok=true}" : data));
  var messages = data.messages;
  //Logger.log(messages);
  
  
  //TodDoデータを生成
  //メッセージ×リアクションをしたユーザのテーブル
  var todoData = [];
  //ユニークユーザリスト
  var todoUsers = [];
  
  //messages配列を処理
  for(var i = 0; i < messages.length; i++){
    Logger.log("messages["+ i +"]");
    
    //||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    //messageが、「チャンネルにも投稿」されたリプライである場合（root要素を持つ場合）
    if(messages[i].root){
      //スキップする
      Logger.log("messages["+ i +"] is a posted-in-channel reply");

    //||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    //messageが、「チャンネルにも投稿」されたリプライではない場合
    }else{
    
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      //messageにリプライが返されている場合（thread_ts要素を持つ場合）
      if(messages[i].thread_ts){
        Logger.log("messages["+ i +"] has replies");
        
        //paginationフラグ
        var paging = true;
        var cursor = "";
        
        //===============================================================
        //paginationが続く間（レスポンスにhas_more, next_cursorが含まれている間）リプライの取得を繰り返す
        while(paging){
          
          //リプライを取得
          //【API】
          // https://api.slack.com/methods/conversations.replies
          //【Limit】
          // Web API Tier 3 : 50+ per minute
          
          var url2 ="https://slack.com/api/conversations.replies";
          url2 += "?token=" + token;
          url2 += "&channel=" + channelId;
          url2 += "&ts=" + messages[i].thread_ts;
          url2 += "&limit=" + limit;
          if(cursor != ""){
            url2 += "&cursor=" + cursor;
          }
          Logger.log("//////// conversations.replies ////////");
          Logger.log(url2);
          
          var response2 = UrlFetchApp.fetch(url2);
          sleep(1200);
          var data2 = JSON.parse(response2.getContentText());
          Logger.log("response="+ (data2.ok ? "{ok=true}" : data2));
          var replies = data2.messages;
          //Logger.log(replies);
          
          //replies配列を処理
          //※親メッセージ（replies[0]）はここでは処理しないようにするため、ii=1 から開始
          //　（paginationを利用した場合に、毎回のレスポンスに親メッセージが含まれるので、親メッセージに対するリアクションが重複しないようにするため）
          for(var ii = 1; ii < replies.length; ii++){
            Logger.log("messages["+ i +"].replies["+ ii +"]");
            
            //---------------------------------------------------------------
            //リアクションが付いている場合
            if(replies[ii].reactions){
              Logger.log("messages["+ i +"].replies["+ ii +"] has reactions");
              
              //reactions配列を処理
              for(var jj = 0; jj < replies[ii].reactions.length; jj++){
                Logger.log("messages["+ i +"].replies["+ ii +"].reactions["+ jj +"]");
                
                //検索対象の（ToDoの）リアクションである場合
                if(replies[ii].reactions[jj].name == reactionName){
                  Logger.log("messages["+ i +"].replies["+ ii +"].reactions["+ jj +"] has ToDo reactions");
                  
                  //reactionを付けたusersの配列を処理
                  for(var kk = 0; kk < replies[ii].reactions[jj].users.length; kk++){
                    Logger.log("Pushed : messages["+ i +"].replies["+ ii +"].reactions["+ jj +"].users["+ kk +"]");
                    
                    //ユーザ
                    var user = replies[ii].reactions[jj].users[kk];
                    
                    //ToDoデータ配列にPush
                    todoData.push({
                      "user": user,
                      "text": replies[ii].text,
                      "ts": replies[ii].ts,
                      "pushed": "messages["+ i +"].replies["+ ii +"].reactions["+ jj +"].users["+ kk +"]"
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
            //---------------------------------------------------------------
          }
          
          //続きのリプライがある（レスポンスにhas_more, next_cursorが含まれている）場合
          if(data2.has_more){
            cursor = data2.response_metadata.next_cursor;
          
          //全てのリプライを取得した（レスポンスにhas_more, next_cursorが含まれていない）場合
          }else{
            paging = false;
          }
        }
        //===============================================================
      }
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      //messageにリアクションが付けられている場合
      //※スレッドの親メッセージはこの中で処理する
      if(messages[i].reactions){
        Logger.log("messages["+ i +"] has reactions");
        
        //reactions配列を処理
        for(var j = 0; j < messages[i].reactions.length; j++){
          Logger.log("messages["+ i +"].reactions["+ j +"]");
          
          //検索対象の（ToDoの）リアクションである場合
          if(messages[i].reactions[j].name == reactionName){
            Logger.log("messages["+ i +"].reactions["+ j +"] has ToDo reactions");
            
            //reactionを付けたusersの配列を処理
            for(var k = 0; k < messages[i].reactions[j].users.length; k++){
              Logger.log("Pushed : messages["+ i +"].reactions["+ j +"].users["+ k +"]");
              
              //ユーザ
              var user = messages[i].reactions[j].users[k];
              
              //ToDoデータ配列にPush
              todoData.push({
                "user": user,
                "text": messages[i].text,
                "ts": messages[i].ts,
                "pushed": "messages["+ i +"].reactions["+ j +"].users["+ k +"]"
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
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    }
    //||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
  }
  Logger.log("//////// todoData ////////");
  Logger.log(todoData);
  Logger.log("//////// todoUsers ////////");
  Logger.log(todoUsers);
  

  //todoDataが存在する場合
  //投稿データを生成して、Slackに投稿実行
  if(todoData.length > 0){
    
    //タイムスタンプの昇順（古い順）に並べ替え
    todoData.sort(function(x, y){
      if (x.ts > y.ts) {
        return 1;
      } else {
        return -1;
      }
    })    
    

    //投稿データを生成
    var postData = [];
    
    //ユニークユーザ配列を処理
    for(var i = 0; i < todoUsers.length; i++){
      //対象ユーザ
      var userId = todoUsers[i];
//      var userInfo = getUserInfo(userId, token);
//      var userName = userInfo.name;
      Logger.log("//////// user ////////");
      Logger.log("todoUsers["+ i +"], userId="+ userId);
//      Logger.log("todoUsers["+ i +"], userName="+ userName);
      
      //投稿テキストを生成
      var postText = userIcon +"<@"+ userId +">\n";
//      var postText = userIcon +"*"+ userName +"*\n";
      
      //ToDoデータ配列のうち、ユーザが対象ユーザのデータのみ抽出
      var todos = todoData.filter(function(item, index){
        if(item.user == userId) return true;
      });
      Logger.log("//////// todos ////////");
      Logger.log(todos);
      
      //対象ユーザのToDo配列を処理
      for(var j = 0; j < todos.length; j++){
        Logger.log("todos["+ j +"]");
        
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
        Logger.log("response="+ (data.ok ? "{ok=true}" : data));
        var link = data.permalink;
        Logger.log(link);
        
        
        //投稿テキストの加工
        var text = String(todos[j].text);
        Logger.log("//////// text ////////");
        
        //メンションを削除
        text = text.replace(/<@.*?>/g, '');
        //Logger.log("text="+ text);
        
        //改行をスペースに変換
        text = text.replace(/\r?\n/g, ' ');
        //Logger.log("text="+ text);
        
        //トリム
        text = text.trim();
        //Logger.log("text="+ text);
        
        //1メッセージあたりの最大文字数にカット
        //※手抜き
        if(text.length > textLength){
          text = text.substring(0, textLength);
          text += "...";
        }
        Logger.log("text="+ text);
        
        //箇条書き＋Permalink付与
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
    
    //フッター（context）を追加
    postData.push({
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": footerText
        }
      ]
    });
    
    //Logger.log("//////// postData ////////");
    //Logger.log(postData);
    
    
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
    // Posting messages    1 per second   short bursts >1 allowed
  
    var postResponse = UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", options);
    sleep(1000);
    Logger.log("//////// chat.postMessage ////////");
    Logger.log(postResponse);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getMyChannels(token){
  //##########################################################################################################
  //取得するチャンネル数（1～1000）
  //publicチャンネルは、自分（bot）が参加していないものも含まれる
  //※対象チャンネルが1000件を超える場合は、paginationを使用するように要改修
  const limit = 1000;
  //##########################################################################################################
  
  // チャンネルを取得
  //【API】
  // https://api.slack.com/methods/conversations.list
  //【Limit】
  // Web API Tier 2 : 20+ per minute

  var url ="https://slack.com/api/conversations.list";
  url += "?token=" + token;
  //アーカイブされたチャンネルを除く
  url += "&exclude_archived=true";
  url += "&limit=" + limit;
  //publicチャンネル（自分が参加していないものも含む）と、privateチャンネル（自分が参加しているもののみ）を対象にする
  url += "&types=public_channel,private_channel";
  Logger.log("//////// conversations.list ////////");
  Logger.log(url);
  
  var response = UrlFetchApp.fetch(url);
  sleep(3000);
  var data = JSON.parse(response.getContentText());
  Logger.log("response="+ (data.ok ? "{ok=true}" : data));
  //Logger.log(data);
  
  //自分（bot）が参加しているチャンネルのみ抽出
  var channels = data.channels.filter(function(item, index){
    if(item.is_member === true) return true;
  });
  //Logger.log(channels);
  
  return channels;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getUserInfo(userId, token){
//  // ユーザ情報を取得
//  //【API】
//  // https://api.slack.com/methods/users.info
//  //【Limit】
//  // Web API Tier 4 : 100+ per minute
//
//  var url ="https://slack.com/api/users.info";
//  url += "?token=" + token;
//  url += "&user=" + userId;
//  Logger.log("//////// users.info ////////");
//  Logger.log(url);
//  
//  var response = UrlFetchApp.fetch(url);
//  sleep(600);
//  var data = JSON.parse(response.getContentText());
//  Logger.log("response="+ (data.ok ? "{ok=true}" : data));
//  //Logger.log(data);
//    
//  return data.user;
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
