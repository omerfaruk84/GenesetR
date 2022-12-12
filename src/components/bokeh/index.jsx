import React, { Component } from 'react';
import {Button} from '@material-ui/core';
import Axios from 'axios';

// ran into this issue (hence no npm import of bokehjs):
// https://github.com/bokeh/bokeh/issues/8197
class Bokeh extends Component {
  handlePlot1 = () => {
    
    
    Axios.get("https://20d5-2001-700-4a01-10-00-39.eu.ngrok.io/plot1?callback=?", {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    }).then(resp => window.Bokeh.embed.embed_item(JSON.parse(resp.data), 'myplot')).catch(
      
      function (error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log('Error', error.message);
        }
        console.log(error.config);
      }
      
      )
    
  }

  render() {
    return (
      <div className="Bokeh" style={{margin: 20}}>        
        <Button variant="contained" style={{margin: 10}} color="primary" onClick={this.handlePlot1}>
          Get Plot
        </Button>       
        <div id='myplot' className="bk-root">       
        </div>
      </div>
    );
  }
}

export { Bokeh };;