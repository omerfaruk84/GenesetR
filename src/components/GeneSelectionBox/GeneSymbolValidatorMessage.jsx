import * as React from "react";
//import styles from './styles.modules. ';
import styles from "./styles.module.scss";

import {
  FaTimesCircle,
  FaQuestionCircle,
  FaExclamationCircle,
  FaCheckCircle,
} from "react-icons/fa";
//import { GeneValidationResult } from './GeneSymbolValidator';
//import { OQL } from './OQLTextArea';

import classNames from "classnames";
import { groupBy, reduce } from "lodash";
import DropdownButton from "react-bootstrap/DropdownButton";
import Dropdown from "react-bootstrap/Dropdown";

const RenderSuggestion = function (props) {
  console.log("props", props);
  if (props.genes.length > 0 && props.type && props.type.startsWith("Not among")) {  
  
    let title = props.genes[0].hugoGeneSymbol.length + (props.type === "Not among targets"? " perturbations ":" genes ") + "were not found in the perturbseq data \n" + props.genes[0].hugoGeneSymbol.toString();
    let onClick = () => props.replaceGene(props.genes[0].hugoGeneSymbol, "");
    return (
      <div className={styles.warningBubble} title={title} onClick={onClick}>
        <FaTimesCircle className={styles.icon} />
        <span className={styles.noChoiceLabel}>{"Not among targets"}</span>
      </div>
    );
  }

  if (props.genes.length > 0 && props.type && props.type.startsWith("Not exists")) {  
  
    let title = props.genes[0].hugoGeneSymbol.length + (props.type === "Not exists targets"? " perturbations ":" genes ") + "were not identified. Click to remove all of them. \n" + props.genes[0].hugoGeneSymbol.toString();
    let onClick = () => props.replaceGene(props.genes[0].hugoGeneSymbol, "");
    return (
      <div className={styles.warningBubble3} title={title} onClick={onClick}>
        <FaTimesCircle className={styles.icon} />
        <span className={styles.noChoiceLabel}>{"Remove All Unknowns"}</span>
      </div>
    );
  }

  if (props.genes.length > 0 && props.type && props.type.startsWith("Alias")) {  
    
    let title = props.genes[0].hugoGeneSymbol.length + (props.type === "Alias targets"? " perturbations ":" genes ") + "have alias gene symbols. Click to change all of them. \n" + props.genes[0].hugoGeneSymbol.toString();
    let onClick = () => props.replaceGene(props.genes[0].hugoGeneSymbol, props.alias);
    return (
      <div className={styles.warningBubble2} title={title} onClick={onClick}>
        <FaTimesCircle className={styles.icon} />
        <span className={styles.noChoiceLabel}>{"Change All Alias"}</span>
      </div>
    );
  }

  if (props.alias &&  props.type && props.type.startsWith("SingleNotExists")) {
    let title =
      "Could not find gene symbol. Click to remove it from the gene list.";
    let onClick = () => props.replaceGene(props.alias, "");
    return (
      <div className={styles.suggestionBubble} title={title} onClick={onClick}>
        <FaTimesCircle className={styles.icon} />
        <span className={styles.noChoiceLabel}>{props.alias}</span>
      </div>
    );
  }

  if (props.type && props.type.startsWith("SingleAlias")) {
    let { hugoGeneSymbol } = props.genes[0];
    let title = `'${hugoGeneSymbol}' is a synonym for '${props.alias}'. Click here to replace it with the official symbol.`;
    let onClick = () => props.replaceGene(hugoGeneSymbol, props.alias);
    return (
      <div className={styles.suggestionBubble} title={title} onClick={onClick}>
        <FaQuestionCircle className={styles.icon} />
        <span className={styles.singleChoiceLabel}>{hugoGeneSymbol}</span>
        <span>{`: ${props.alias}`}</span>
      </div>
    );
  }

  return;


  //NEED TO FIX THIS LATER HUGO GENESYMBOL AND ALIAS NEED TO BE CHANGED
  let title =
    "Ambiguous gene symbol. Click on one of the alternatives to replace it.";
  let options = props.genes.map((gene) => ({
    label: gene.hugoGeneSymbol,
    value: gene.hugoGeneSymbol,
  }));
  return (
    <div className={styles.suggestionBubble} title={title}>
      <FaQuestionCircle className={styles.icon} />
      <span className={styles.multiChoiceLabel}>{props.alias}</span>
      <span>{":"}&nbsp;</span>
      <DropdownButton
        variant={title.toLowerCase()}
        size="sm"
        title="Select symbol"
        id={`geneReplace_${props.alias}`}
      >
        {options.map((item, i) => {
          return (
            <Dropdown.Item
              onClick={() => {
                props.replaceGene(props.alias, item.value);
              }}
              eventKey={i + 1}
            >
              {item.label}
            </Dropdown.Item>
          );
        })}
      </DropdownButton>
    </div>
  );
};

const GeneSymbolValidatorMessageChild = (props) => {
  console.log("props in ge",props)
  if (props.isEmpty) {
    return null;
  }

  if (props.validatingGenes) {
    return (
      <div className={styles.GeneSymbolValidator}>
        <span className={styles.pendingMessage}>
          Validating gene symbols...
        </span>
      </div>
    );
  }

  if (props.suggestions && props.suggestions instanceof Error) {
    return (
      <div className={styles.GeneSymbolValidator}>
        <span className={styles.pendingMessage}>
          Unable to validate gene symbols.
        </span>
      </div>
    );
  }

  if (props.suggestions && props.suggestions.length > 0) {
    return (
      <div className={styles.GeneSymbolValidator}>
        <div
          className={styles.invalidBubble}
          title="Please edit the gene symbols."
        >
          <FaExclamationCircle className={styles.icon} />
          <span>Invalid gene symbols.</span>
        </div>
        

        {props.suggestions.map((suggestion, index) => (          
          <RenderSuggestion
            key={index}
            genes={suggestion.genes}
            alias={suggestion.alias}
            type={suggestion.type}
            replaceGene={props.replaceGene}                 
          />
        ))}
      </div>
    );
  }

  
  return (
    <div
      className={classNames(styles.GeneSymbolValidator)}
    >
      <div className={styles.validBubble} title="You can now submit the list.">
        <FaCheckCircle className={styles.icon} name="check-circle" />
        <span>&nbsp;All gene symbols are valid.</span>
      </div>
    </div>
  );
};

export default class GeneSymbolValidatorMessage extends React.Component {
  render() {
    if (this.props.children) {
      return <div id="wideGeneBoxValidationStatus">{this.props.children}</div>;
    }

    return (
      <div id="geneBoxValidationStatus">
        <GeneSymbolValidatorMessageChild {...this.props} />
      </div>
    );
  }
}
