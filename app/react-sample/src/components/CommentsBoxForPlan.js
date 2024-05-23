import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import { Divider, Grid, Paper } from "@material-ui/core";
import TextField from "@mui/material/TextField";
import { Typography } from '@mui/material';
import { API_LOGIN, API_GET_PLAN_DETAIL, API_GET_USER } from '../global/constants';
import axios from 'axios';
import { useState, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import Button from '@mui/material/Button';
import { useRef } from "react";
import { getAuthToken } from '../utils';
import { useTranslation } from 'react-i18next';

const style = {
  margin: "0.5rem"
};

// 頭像顏色根據名字變化
function stringToColor(string) {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}
function stringAvatar(name) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name[0]}`,
  };
}

export default function CommentsBox({ id }) {
    const [data, setData] = useState([]); //留言資料
    const [userToken, setUserToken] = useState(getAuthToken());
    const inputRef = useRef();
    const { t, i18n } = useTranslation();
    const [username, setUsername] = useState('');

    const subtitle = { 
        width: "150px" 
      };

    useEffect(() => {
        //儲存token
        const token = userToken;
        //設定authorization
        const bodyParameters = {
          key: "value",
        };
        const config = {bodyParameters,
            headers: { "authorization": `Bearer ${token}`}
        };

        //取得活動留言資訊
        axios.get(API_GET_PLAN_DETAIL + id + '/discussion', config)
          .then(function (res) {
            console.log(res.data);
            setData(res.data);
          })
          .catch(function (err) {
            console.log(err);
            console.log("取得留言出現錯誤");
          });

        //取得使用者id
        axios.get(API_GET_USER, config)
          .then(function (res) {
            setUsername(res.data.members['name']);
          })
          .catch(function (err) {
            console.log(err);
            alert("error");
          });

    }, [id]);

    // 留言
    const handleComment = (event) => {
      event.preventDefault();

      // 若為空值，無法留言
      if (inputRef.current.value === "") {
        alert("請輸入留言");
        return;
      };

          //儲存token
          const token = getAuthToken();
          //設定authorization
          const bodyParameters = {
            key: "value",
          };
          const config = {bodyParameters,
              headers: { "authorization": `Bearer ${token}`}
          };
  
          //留言api
          axios.post(API_GET_PLAN_DETAIL + id + '/discussion', { 
            "content": inputRef.current.value
          },
          config)
            .then(function (res) {
                console.log(res);
                //alert('留言成功');
                window.location.reload(false);
            })
            .catch(function (err) {
                alert("留言失敗");
                console.log(err);
          });
    };

  return (
    <Box
      sx={{
        display: 'flex',
        '@media (max-width: 600px)': {
          display: 'block',
        },
      }}
    >
      <div style={subtitle}><Typography variant="h6"> {t('討論串')} </Typography></div>
      <Paper style={{ padding: "30px 30px", width: "100%" }}>

        {data.map((comment) => (
          <>
            <Grid container wrap="nowrap" spacing={2}>
              <Grid item>
                <Avatar {...stringAvatar(comment.Sender.name ? comment.Sender.name : "Unknown")} />
              </Grid>
              <Grid justifyContent="left" item xs zeroMinWidth>
                <h4 style={{ margin: 0, textAlign: "left" }}> {comment.Sender.name ? comment.Sender.name : "未知"} </h4>
                <p style={{ textAlign: "left" }}>
                  {comment.content ? comment.content : "無內容"}{" "}
                </p>
              </Grid>
            </Grid>
            <Divider variant="fullWidth" style={{ margin: "20px 0" }} />
          </>
        ))}

        <Grid container wrap="nowrap" spacing={2}>
          <Grid item>
            <Avatar {...stringAvatar(username)} />
          </Grid>

          <Grid justifyContent="left" item xs zeroMinWidth spacing={5}>
            <h4 style={{ margin: 0, textAlign: "left" }}> {username} </h4>
            <TextField
              fullWidth
              variant="outlined"
              sx={{ mt: 1 }}
              label="Add comment"
              inputRef={inputRef}
            />
            <div style={style}>
              <Button type="submit" fullWidth variant="contained" color="primary" onClick={handleComment}>
                <SendIcon />
              </Button>
            </div>
          </Grid>

        </Grid>
      </Paper>
    </Box>
  );
}