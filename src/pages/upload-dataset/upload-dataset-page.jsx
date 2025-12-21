import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Alert,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import styles from './upload-dataset-page.module.scss';
import { uploadDataset, checkUploadProgress } from '../../store/api';
import { addUserDataset, coreSettingsChanged, fetchDatasetsFromBackend } from '../../store/settings/core-settings';
import { ROUTES } from '../../common/routes';

const moduleDescription = {
  title: "Upload Your Own Dataset",
  description: "Upload your Perturb-Seq data matrix to analyze with GeneSetR. Your data will be processed and stored temporarily for 48 hours. Supports CSV/TSV format with genes on rows and perturbations on columns (or transposed).",
  requirements: [
    "File format: CSV or TSV",
    "Maximum file size: 100 MB",
    "Data format: Genes (rows) × Perturbations (columns) or transposed",
    "Data type: Raw counts or Z-scored (select appropriate option)",
    "Gene names: Standard gene symbols (HUGO recommended)"
  ]
};

const UPLOAD_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error'
};

const UploadDatasetPage = ({ sessionId, dispatch }) => {
  const navigate = useNavigate();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  // Form state
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isZScored, setIsZScored] = useState(false);
  const [isTransposed, setIsTransposed] = useState(false);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState(UPLOAD_STATUS.IDLE);
  const [uploadId, setUploadId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedDataset, setUploadedDataset] = useState(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Validation
  const [fileError, setFileError] = useState('');
  const [nameError, setNameError] = useState('');

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Validate file
  const validateFile = (file) => {
    if (!file) {
      setFileError('Please select a file');
      return false;
    }

    const validExtensions = ['.csv', '.tsv', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      setFileError('Invalid file type. Please upload CSV or TSV file.');
      return false;
    }

    const maxSize = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxSize) {
      setFileError(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum is 100 MB.`);
      return false;
    }

    setFileError('');
    return true;
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      // Auto-fill name if empty
      if (!name) {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setName(baseName);
      }
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // Poll upload progress
  const pollProgress = useCallback(async (uploadId) => {
    try {
      const progressData = await checkUploadProgress(uploadId, sessionId);

      console.log('Progress data received:', progressData);

      setProgress(progressData.progress || 0);
      setCurrentStep(progressData.message || progressData.step || '');

      if (progressData.status === 'completed') {
        console.log('Upload completed! Dataset metadata:', progressData.dataset);
        setUploadStatus(UPLOAD_STATUS.SUCCESS);
        setUploadedDataset(progressData.dataset);

        // Add dataset to Redux store
        if (progressData.dataset && dispatch) {
          console.log('Adding dataset to Redux store');
          dispatch(addUserDataset(progressData.dataset));
        } else {
          console.error('No dataset metadata in completed progress response!');
        }

        // Refresh dataset list to include newly uploaded dataset
        if (sessionId && dispatch) {
          console.log('Refreshing dataset list after upload completion');
          dispatch(fetchDatasetsFromBackend(sessionId));
        }

        return true; // Stop polling
      } else if (progressData.status === 'failed') {
        setUploadStatus(UPLOAD_STATUS.ERROR);
        setErrorMessage(progressData.error || 'Upload failed');
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (error) {
      console.error('Error checking progress:', error);
      setUploadStatus(UPLOAD_STATUS.ERROR);
      setErrorMessage(error.message || 'Failed to check upload progress');
      return true; // Stop polling
    }
  }, [dispatch, sessionId]);

  // Start polling when upload ID is set
  useEffect(() => {
    if (!uploadId || uploadStatus !== UPLOAD_STATUS.PROCESSING) {
      return;
    }

    let isCancelled = false;
    let timeoutId;

    const poll = async () => {
      if (isCancelled) return;

      const shouldStop = await pollProgress(uploadId);

      if (!shouldStop && !isCancelled) {
        timeoutId = setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };

    poll();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [uploadId, uploadStatus, pollProgress]);

  // Handle upload
  const handleUpload = async () => {
    // Validate
    if (!file) {
      setFileError('Please select a file');
      return;
    }
    if (!name.trim()) {
      setNameError('Please enter a dataset name');
      return;
    }

    if (!validateFile(file)) {
      return;
    }

    if (!sessionId) {
      setErrorMessage('Session not initialized. Please refresh the page and try again.');
      return;
    }

    setNameError('');
    setUploadStatus(UPLOAD_STATUS.UPLOADING);
    setProgress(0);
    setCurrentStep('Uploading file...');
    setErrorMessage('');

    try {
      const result = await uploadDataset({
        file,
        name: name.trim(),
        description: description.trim(),
        isZScored,
        isTransposed,
        sessionId
      });

      setUploadId(result.upload_id);
      setUploadStatus(UPLOAD_STATUS.PROCESSING);
      setCurrentStep(result.message || 'Processing upload...');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(UPLOAD_STATUS.ERROR);
      setErrorMessage(error.message || 'Upload failed');
    }
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setName('');
    setDescription('');
    setIsZScored(false);
    setIsTransposed(false);
    setUploadStatus(UPLOAD_STATUS.IDLE);
    setUploadId(null);
    setProgress(0);
    setCurrentStep('');
    setErrorMessage('');
    setUploadedDataset(null);
    setFileError('');
    setNameError('');
  };

  // Navigate to analysis
  const handleStartAnalysis = () => {
    console.log('Start Analyzing clicked', { uploadedDataset, hasDispatch: !!dispatch });

    if (!uploadedDataset) {
      console.error('No uploaded dataset available');
      return;
    }

    if (!dispatch) {
      console.error('Redux dispatch not available');
      return;
    }

    // Set the uploaded dataset as the active dataset
    const datasetToSet = {
      id: uploadedDataset.id,
      perturbationCount: uploadedDataset.perturbationCount,
      geneCount: uploadedDataset.geneCount,
      isMixscape: uploadedDataset.isMixscape || false,
      name: uploadedDataset.name,
      isUserUploaded: true
    };

    console.log('Setting active dataset:', datasetToSet);

    dispatch(coreSettingsChanged({
      settingName: 'cellLine',
      newValue: datasetToSet
    }));

    console.log('Navigating to correlation page');

    // Navigate to correlation page (better for testing uploaded data)
    navigate(ROUTES.CORRELATION);
  };

  const isFormValid = file && name.trim() && !fileError && !nameError && sessionId;
  const isUploading = uploadStatus === UPLOAD_STATUS.UPLOADING || uploadStatus === UPLOAD_STATUS.PROCESSING;

  // Show loading if session not initialized
  if (!sessionId) {
    return (
      <div className={styles.uploadPage}>
        <Card className={styles.progressCard}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Initializing Session...
            </Typography>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" style={{ marginTop: '16px' }}>
              Please wait while we set up your session. This should only take a moment.
            </Typography>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.uploadPage}>
      <Accordion
        expanded={isDescriptionExpanded}
        onChange={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        className={styles.descriptionAccordion}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">{moduleDescription.title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            {moduleDescription.description}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Requirements:
          </Typography>
          <ul className={styles.requirementsList}>
            {moduleDescription.requirements.map((req, idx) => (
              <li key={idx}>
                <Typography variant="body2">{req}</Typography>
              </li>
            ))}
          </ul>
        </AccordionDetails>
      </Accordion>

      <Box className={styles.uploadContainer}>
        {uploadStatus === UPLOAD_STATUS.IDLE && (
          <Paper className={styles.uploadForm}>
            <Typography variant="h6" gutterBottom>
              Upload Dataset
            </Typography>

            {/* File Upload Zone */}
            <Box
              className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${fileError ? styles.error : ''}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <CloudUploadIcon className={styles.uploadIcon} />

              {file ? (
                <Box className={styles.fileInfo}>
                  <Typography variant="body1" className={styles.fileName}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileError('');
                    }}
                    startIcon={<CloseIcon />}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1">
                    Drag and drop your file here
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    or click to browse
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Supports CSV, TSV (max 100 MB)
                  </Typography>
                </Box>
              )}
            </Box>

            {fileError && (
              <Alert severity="error" className={styles.errorAlert}>
                {fileError}
              </Alert>
            )}

            {/* Metadata Form */}
            <TextField
              label="Dataset Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              error={!!nameError}
              helperText={nameError || 'A descriptive name for your dataset'}
              fullWidth
              required
              margin="normal"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              helperText="Optional description of your dataset"
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />

            {/* Options */}
            <Box className={styles.optionsBox}>
              <Typography variant="subtitle2" gutterBottom>
                Data Options:
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={isZScored}
                    onChange={(e) => setIsZScored(e.target.checked)}
                  />
                }
                label="My data is already Z-scored"
              />
              <Typography variant="caption" color="textSecondary" display="block" className={styles.optionHelp}>
                Check this if your data is already normalized with Z-scores. Otherwise, we'll compute Z-scores for you.
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={isTransposed}
                    onChange={(e) => setIsTransposed(e.target.checked)}
                  />
                }
                label="My data has perturbations on rows and genes on columns"
              />
              <Typography variant="caption" color="textSecondary" display="block" className={styles.optionHelp}>
                Check this if your data matrix is transposed (perturbations × genes instead of genes × perturbations).
              </Typography>
            </Box>

            {/* Upload Button */}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleUpload}
              disabled={!isFormValid}
              startIcon={<CloudUploadIcon />}
              fullWidth
              className={styles.uploadButton}
            >
              Upload and Process Dataset
            </Button>
          </Paper>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <Card className={styles.progressCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {uploadStatus === UPLOAD_STATUS.UPLOADING ? 'Uploading...' : 'Processing Dataset'}
              </Typography>

              <Box className={styles.progressBar}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="body2" color="textSecondary" className={styles.progressText}>
                  {progress}%
                </Typography>
              </Box>

              {currentStep && (
                <Typography variant="body2" className={styles.currentStep}>
                  {currentStep}
                </Typography>
              )}

              <Typography variant="caption" color="textSecondary" display="block" className={styles.progressNote}>
                This may take 2-5 minutes depending on dataset size. Please don't close this page.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {uploadStatus === UPLOAD_STATUS.SUCCESS && (
          <Card className={styles.successCard}>
            <CardContent>
              <Box className={styles.successHeader}>
                <CheckCircleIcon className={styles.successIcon} />
                <Typography variant="h6">
                  Upload Successful!
                </Typography>
              </Box>

              <Typography variant="body1" paragraph>
                Your dataset "{uploadedDataset?.name || name}" has been processed and is ready to use.
              </Typography>

              {uploadedDataset && (
                <Box className={styles.datasetInfo}>
                  <Typography variant="body2" color="textSecondary">
                    Genes: {uploadedDataset.geneCount} | Perturbations: {uploadedDataset.perturbationCount}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Dataset will expire in 48 hours
                  </Typography>
                </Box>
              )}

              <Box className={styles.successActions}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleStartAnalysis}
                >
                  Start Analyzing
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                >
                  Upload Another Dataset
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {uploadStatus === UPLOAD_STATUS.ERROR && (
          <Card className={styles.errorCard}>
            <CardContent>
              <Box className={styles.errorHeader}>
                <ErrorIcon className={styles.errorIcon} />
                <Typography variant="h6">
                  Upload Failed
                </Typography>
              </Box>

              <Alert severity="error" className={styles.errorMessage}>
                {errorMessage}
              </Alert>

              <Box className={styles.errorActions}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleReset}
                >
                  Try Again
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </div>
  );
};

const mapStateToProps = (state) => ({
  sessionId: state?.settings?.core?.sessionId || null,
});

export default connect(mapStateToProps)(UploadDatasetPage);
