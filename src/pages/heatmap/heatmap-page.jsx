import React from 'react';
import { connect } from 'react-redux';
import { Heading, Spacer } from "@oliasoft-open-source/react-ui-library";
import { HeatMap } from '../../components/heat-map';
import styles from './heatmap-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const HeatMapPage = ({ heatmapResults }) => {
  return (
    <div className={styles.mainView}>
      <Heading>Heatmap</Heading>
      <Spacer />
      {heatmapResults ? (
        <HeatMap graphData={heatmapResults} />
      ) : (
        <div className={styles.infoSection}>
          <p className={styles.moduleTextInfos}>            
            Correlation is a statistical measure that describes the strength and direction of the relationship between two variables. It ranges from -1 to 1, where -1 indicates a perfect negative correlation, 0 indicates no correlation, and 1 indicates a perfect positive correlation.<br/>
            <br/>
            <h4>Correlation algorithms can be classified as parametric or nonparametric methods.</h4>

            
            <img alt='Pearson correlation sensitive to outliers' src='/images/corr-false-positive.png' className={`${styles['float-right']} ${styles['responsive-image']}`} />
            <b>Parametric correlation algorithms</b>, such as Pearson correlation, assume that the data follows a particular probability distribution, such as a normal distribution, and require that certain parameters, such as the mean and standard deviation, are known or estimated from the data.Non-parametric correlation algorithms, such as <b>Spearman and Kendall correlation</b>, do not make any assumptions about the underlying distribution of the data, hence they should be prefered over parametric methods when the data is not normally distributed, or when the sample size is small. They can handle non-linear relationships between variables, and have a main advantage of being <b>more robust to outliers</b> as they do not rely on the mean and standard deviation, which are sensitive to extreme values.
            

            Pearson’s Correlation measures a linear relationship between two variables, while Kendall’s and Spearman’s correlations measure how likely it is for two variables to move in the same direction, but not necessarily at a constant rate.   In other means, Kendall’s and Spearman’s correlations assess statistical associations based on the ranks of the data. 
            <br/><br/>
            <img alt='Pearson correlation sensitive to outliers' src='/images/corr-false-negative.png' className={`${styles['float-right']} ${styles['responsive-image']}`} />
            Kendall's Tau correlation coefficient tends to produce smaller values than Spearman's rho, and it is calculated based on concordant and discordant pairs, making it less sensitive to errors. P values are more accurate when sample sizes are small. In contrast, Spearman's rho usually produces larger values than Kendall's Tau, and it is calculated based on deviations, making it more sensitive to errors and discrepancies in data.
            <br/><br/>
            Using Kendall's Tau has several advantages. Its distribution has better statistical properties, and its interpretation in terms of probabilities of observing agreeable and non-agreeable pairs is straightforward. Although Kendall's Tau and Spearman's rho may differ in certain situations, their interpretations and inferences are typically similar.
          </p>
          

          
        </div>
      )}
    </div>
  );
}

const mapStateToProps = ({ calcResults }, { path }) => ({
  heatmapResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});

const MainContainer = connect(mapStateToProps)(HeatMapPage);
export { MainContainer as HeatMapPage };