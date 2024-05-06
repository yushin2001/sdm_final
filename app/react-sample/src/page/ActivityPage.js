// 活動完整資訊
import React, { useState } from 'react';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid'
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import { ThemeProvider } from '@mui/material/styles';
import { Typography} from '@mui/material';
import PendingReview from '../components/PendingReview';
import CommentsBox from '../components/CommentsBox';
import theme from '../components/Theme'; 
import HeaderBar from '../components/HeaderBar';
import ReviewBox from '../components/ReviewBox';
import Box from '@mui/material/Box';
import './Common.css';
import EditActivityPage from './EditActivityPage'; 
import {useLocation} from 'react-router-dom';
import { API_LOGIN, API_GET_ACTIVITY_DETAIL } from '../global/constants';
import axios from 'axios';
import { useEffect } from 'react';

function ActivityPage() {
  const { state } = useLocation();
  const { id } = state; // Read values passed on state
  const [data, setData] = useState([]);

  useEffect(() => {
    //登入
    async function runEffect(){
    await axios.post(API_LOGIN, {
      "email": "r12725066@ntu.edu.tw",
      "password": "a"
    })
    .then(function (response) {
        console.log(response.status, response.data);
        //儲存token
        const token = response.data.jwtToken;
        //設定authorization
        const config = {
            headers: { 
              authorization: `Bearer ${token}`
            }
        };
        //取得活動資訊
        axios.get(API_GET_ACTIVITY_DETAIL + id, config)
          .then(function (res) {
            console.log(res.data);
            setData(res.data);
          })
          .catch(function (err) {
            console.log(err);
            alert("error");
          });

      })
      .catch(function (error) {
          console.log(error);
      });
      }
      runEffect();
  }, [id]);

  const [editingShow, setEditingShow] = useState(false);
  const [attend, setAttend] = useState(false); // 參加活動
  const handleAttend = () => {
    if(data.need_review){
      axios.post(API_LOGIN, {
        "email": "r12725066@ntu.edu.tw",
        "password": "a"
      })
      .then(function (response) {
          console.log(response.status, response.data);
          //儲存token
          const token = response.data.jwtToken;
          console.log(token);
          //設定authorization
          const bodyParameters = {
            key: "value",
          };
          const config = {bodyParameters,
              headers: { "authorization": `Bearer ${token}`}
          };
  
          //送加入申請
          axios.post(API_GET_ACTIVITY_DETAIL + id + 'apply', config)
            .then(function (res) {
                console.log(res);
                setAttend(true);
                alert('已送出申請');
            })
            .catch(function (err) {
                alert("送出失敗");
                console.log(err);
          });
      })
      .catch(function (error) {
        // 登入中間出錯
        alert("送出失敗");
        console.log(error);
      });
    }
    else{
      // 不需審核
      axios.post(API_LOGIN, {
        "email": "r12725066@ntu.edu.tw",
        "password": "a"
      })
      .then(function (response) {
          console.log(response.status, response.data);
          //儲存token
          const token = response.data.jwtToken;
          console.log(token);
          //設定authorization
          const bodyParameters = {
            key: "value",
          };
          const config = {bodyParameters,
              headers: { "authorization": `Bearer ${token}`}
          };
  
          //送加入申請
          axios.post(API_GET_ACTIVITY_DETAIL + id + '/apply', config)
            .then(function (res) {
                console.log(res);
                setAttend(true);
                alert('已加入');
            })
            .catch(function (err) {
                alert("加入失敗");
                console.log(err);
          });
      })
      .catch(function (error) {
        // 登入中間出錯
        alert("參加失敗");
        console.log(error);
      });
    }
  };
  const handleQuit = () => {
    setAttend(false);
    alert("退出成功");
  };

  window.scrollTo(0, 0); //讓進入畫面在上方
  const subtitle = { 
    width: "150px" 
  };
  const container = { 
    display: "flex" 
  };

  return (
    <ThemeProvider theme={theme}>
      <HeaderBar />
      <div className='Main'>

      <Box
      sx={{
        display: 'none', 
        marginBottom: '20px',
        '@media (min-width: 900px)': {
          display: 'block', 
        }
      }}
    >
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Stack direction="row" spacing={3}>
            <Typography variant="h4">{data.name? data.name: "未命名活動名稱"}</Typography>
            <Chip avatar={<Avatar>{data.Creator? data.Creator.name[0]: "未知建立者"}</Avatar>} label={data.Creator? data.Creator.name: "未知建立者"} />
            <Chip sx={{ bgcolor: theme.palette.hashtag.oneTime}} label={data.is_one_time? "一次性活動": "長期性活動"}/>
            <Chip sx={{ bgcolor: theme.palette.hashtag.review}} label={data.need_reviewed? "需審核": "不需審核"}/>
            <Chip sx={{ bgcolor: theme.palette.hashtag.type}} label={data.type? data.type: "未指定"}/>
            <Chip sx={{ bgcolor: theme.palette.hashtag.type}} label={"ID: " + id}/>
          </Stack>
          <Button variant="contained" color="primary" onClick={() => setEditingShow(true)}> 編輯活動 </Button> 
        </Stack>
        {editingShow &&
          <EditActivityPage /** 編輯視窗 */
            show={editingShow}
            onHide={() => setEditingShow(false)}
            name={data.name? data.name: ""}
            introduction={data.introduction? data.introduction: ""}
            date={data.date? data.date: ""}
            location={data.location? data.location: ""}
            max_participants={data.max_participants? data.max_participants: ""}
            ActivityAtendee=""
            oneTime={data.is_one_time? data.is_one_time: ""}
            need_reviewed={data.need_reviewed? data.need_reviewed: ""}
            type={data.type? data.type: "未指定"}
            id={id}
            application_problem={data.application_problem? data.application_problem: ""}
          />
          }
      </Box>

      <Box
        sx={{
          display: 'block', 
          marginBottom: '20px',
          '@media (min-width: 900px)': {
            display: 'none', 
          }
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="space-between"         
          sx={{
              marginBottom: '10px'
        }}>
          <Typography variant="h4">{data.name? data.name: "未命名活動名稱"}</Typography>
          <Button variant="contained" color="primary" onClick={() => setEditingShow(true)}> 編輯活動 </Button> 
        </Stack>
        <Stack direction="row" spacing={3}>
          <Chip avatar={<Avatar>M</Avatar>} label={data.Creator? data.Creator.name: "未知建立者"} />
          <Chip sx={{ bgcolor: theme.palette.hashtag.oneTime}} label={data.is_one_time? "一次性活動": "長期性活動"}/>
          <Chip sx={{ bgcolor: theme.palette.hashtag.review}} label={data.need_review? "需審核": "不需審核"}/>
          <Chip sx={{ bgcolor: theme.palette.hashtag.type}} label={data.type? data.type: "未指定"}/>
        </Stack>
      </Box>

      <div style={container}>
        <div style={subtitle}><Typography variant="h6"> 活動簡介 </Typography></div>
        <div><Typography variant="h6"> {data.introduction? data.introduction: "尚無活動簡介"} </Typography></div>
      </div>

      <div style={container}>
        <div style={subtitle}><Typography variant="h6"> 活動時間 </Typography></div>
        <div><Typography variant="h6"> {data.date? data.date: "尚無活動時間資料"} </Typography></div>
      </div>

      <div style={container}>
        <div style={subtitle}><Typography variant="h6"> 活動地點 </Typography></div>
        <div><Typography variant="h6"> {data.location? data.location: "尚無活動地點資料"} </Typography></div>
      </div>

      <div style={container}>
        <div style={subtitle}><Typography variant="h6"> 人數上限 </Typography></div>
        <div><Typography variant="h6"> {data.max_participants? data.max_participants: "尚無人數上限"} </Typography></div>
      </div>

      <div style={container}>
        <div style={subtitle}><Typography variant="h6"> 參加者 </Typography></div>
        <div style={{alignSelf: 'center'}}><Avatar alt="Remy Sharp"/></div>
      </div>

      <br/>
      <br/>

      <div style={container}>
        <div style={subtitle}><Typography variant="h6"> 加入審核 </Typography></div>
        <div><PendingReview id={id}/></div>
      </div>
      
      <br/>
      <br/>

      <CommentsBox id={id}/>

      <br/>
      <br/>
      
      <Grid container justifyContent="center">
        <Grid item>
        {attend?
          <Button variant="contained" color="warning" onClick={handleQuit}> 退出活動 </Button>:
          <ReviewBox id={id} question={data.application_problem? data.application_problem: ""} need_reviewed={data.need_reviewed} attendfuction={handleAttend}/>
        }
      </Grid>
      </Grid>

    </div>
    </ThemeProvider>
  );
}

export default ActivityPage;