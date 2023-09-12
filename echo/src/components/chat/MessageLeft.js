import React from 'react'
import Avatar from '@mui/material/Avatar';
import { Typography, Grid } from '@mui/material';

function MessageLeft({ message }) {
  return (
    <Grid container className='leftMessage' direction={"row"} sx={{ flexFlow: "row" }}>
      <Grid item>
        <Avatar alt={message.name} src={message.img} sx={{ width: "1.5rem", height: "1.5rem" }} />
      </Grid>
      <Grid item>
        <Grid container direction={"row"} sx={{ flexFlow: "column" }}>
          <Grid item>
            <Typography variant="body1" sx={{ fontWeight: "bold", fontSize: "1rem", textAlign: "left", color: "rgb(115, 24, 115)" }}>
              {message.name}
            </Typography>
          </Grid>
          <Grid item>
            <div className="messageText">
              {message.message}
            </div>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default MessageLeft