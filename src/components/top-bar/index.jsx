import React from 'react';
import { useNavigate, useLocation, } from 'react-router-dom';
import { TopBar as TopBarCmp } from '@oliasoft-open-source/react-ui-library';
import { FaHome } from 'react-icons/fa';
import { FcMindMap, FcScatterPlot, FcGrid, FcLineChart, FcSerialTasks } from "react-icons/fc";
import { ROUTES, isActiveTab } from '../../common/routes';
import { TabNames } from './enums';
import  styles from './top-bar.module.scss';

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const navLinks = [
    {
      icon: () => <FaHome />,
      name: TabNames.HOME,
      toLink: ROUTES.HOME
    },
    { 
      icon: () => <FcLineChart />,     
      name: TabNames.CORRELATION,
      toLink: ROUTES.CORRELATION
    },
    { 
      icon: () => <FcScatterPlot />,   
      name: TabNames.DR,
      toLink: ROUTES.DR
    },   
    
    { 
      icon: () =><FcSerialTasks /> ,   
      name: TabNames.GENE_REGULATION,
      toLink: ROUTES.GENE_REGULATION
    },
    {  
      icon: () =><FcGrid />,
      name: TabNames.HEATMAP,
      toLink: ROUTES.HEATMAP
    },
    {
      icon: () => <FcMindMap />,
      name: TabNames.PATHFINDER,
      toLink: ROUTES.PATHFINDER
    },
    {
      icon: () => <FcMindMap />,
      name: TabNames.GENESIGNATURE,
      toLink: ROUTES.GENESIGNATURE
    },
  ]
  return (
    <div>
       <style>
        {`
          #root > div > div.main-view_mainView__ZF1p5 > div:nth-child(1) > div > div > div._right_1xgsk_396 {
            display: none;          
          }
          
          #root > div > div.main-view_mainView__ZF1p5 > div:nth-child(1) > div > div{            
            justify-content: center;
           } 

          #root > div > div.main-view_mainView__ZF1p5 > div:nth-child(1) > div > div > div._left_1xgsk_395 > div{
          margin-left: 7px;
          //box-shadow: 0 0 50px 3px #616467;
          //backdrop-filter: blur(30px);
          //width:140px;
          //justify-content: center;    
          //height:60px;
          //border-radius: 15px;
         }
         #root > div > div.main-view_mainView__ZF1p5 > div:nth-child(1) > div > div > div._left_1xgsk_395 > div:hover{
          //box-shadow: 0 0 50px 3px #616467;
          //height:65px;
          //width:140px;
          //border-radius: 15px;
         }
         #root > div > div.main-view_mainView__ZF1p5 > div:nth-child(1) > div > div > div._left_1xgsk_395 > div> a > svg{
          height:25px;
          width:25px;          
         }

         #root > div > div.main-view_mainView__ZF1p5 > div:nth-child(1) > div > div > div._left_1xgsk_395 > div._item_1xgsk_413._brand_1xgsk_382 > div > div > div._logo_1xgsk_374 > img{
          //height:80px;
          //width:140px;   
         }


        `}
      </style>

    <TopBarCmp   
      
      content={
        
        navLinks.map(({ icon, name, toLink }) => ({
          icon: icon(),
          label: name,
          onClick: () => navigate(toLink),
          type: 'Link',
          active: isActiveTab(pathname, toLink),
        }))
      }
      title={{
        
        onClick: () => navigate(ROUTES.HOME),
        version: 'V0.1.1',
        logo: <img alt="logo" src="/images/logo.png"/>,

      }}
      contentRight= {undefined}
     
    />
    </div>
  );
};

export { TopBar };