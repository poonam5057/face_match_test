import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Button,
  Text,
  Image,
  TouchableHighlight,
  Alert,
  NativeEventEmitter,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import ImagePicker, {
  launchImageLibrary,
  launchCamera,
} from 'react-native-image-picker';
import FaceSDK, {
  Enum,
  FaceCaptureResponse,
  LivenessResponse,
  MatchFacesResponse,
  MatchFacesRequest,
  MatchFacesImage,
  MatchFacesSimilarityThresholdSplit,
  RNFaceApi,
  LivenessNotification,
  VideoEncoderCompletion,
} from '@regulaforensics/react-native-face-api';

interface IProps {}

interface IState {
  img1: any;
  img2: any;
  similarity: string;
  liveness: string;
}

var image1 = new MatchFacesImage();
var image2 = new MatchFacesImage();

export default class App extends React.Component<IProps, IState> {
  constructor(props: {} | Readonly<{}>) {
    super(props);

    const eventManager = new NativeEventEmitter(RNFaceApi);
    eventManager.addListener('onCustomButtonTappedEvent', event =>
      console.log(event),
    );
    eventManager.addListener('videoEncoderCompletionEvent', json => {
      var completion = VideoEncoderCompletion.fromJson(JSON.parse(json))!;
      console.log('VideoEncoderCompletion:');
      console.log('    success: ' + completion.success);
      console.log('    transactionId: ' + completion.transactionId);
    });
    eventManager.addListener('livenessNotificationEvent', json => {
      var notification = LivenessNotification.fromJson(JSON.parse(json))!;
      console.log(
        'LivenessNotification-------------s-----------:',
        notification.response?.exception?.message,
      );
      console.log('LivenessProcessStatus: ' + notification.status);
    });

    FaceSDK.init(
      json => {
        console.log('Init success:--------------------- ', json);
        var response = JSON.parse(json);
        if (!response['success']) {
          console.log('Init failed: ');
          console.log(json);
        }
      },
      _e => {},
    );

    this.state = {
      img1: require('./images/portrait.png'),
      img2: require('./images/portrait.png'),
      similarity: 'nil',
      liveness: 'nil',
      isLoader: false,
      matchData: 0,
    };
  }

  handleStateChange = () => {
    console.log('State has changed. New count:', this.state.matchData);
    if (this.state.matchData === 1) {
      this.pickImage(true);
    } else if (this.state.matchData === 2) {
      this.pickImage2(false);
    } else {
      this.matchFaces();
    }
  };

  faceMatchMethod = () => {
    this.setState(
      prevState => ({
        matchData: prevState.matchData + 1,
      }),
      this.handleStateChange,
    );
  };

  componentDidMount(): void {
    if (this.state.matchData === 1) {
      this.pickImage(true);
    } else if (this.state.matchData === 2) {
      this.pickImage2(false);
    } else {
      this.matchFaces();
    }
  }

  pickImage(first: boolean) {
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
      },
      response => {
        if (response.assets == undefined) return;
        this.faceMatchMethod();
        this.setImage(
          first,
          response.assets[0].base64!,
          Enum.ImageType.PRINTED,
        );
      },
    );
  }

  pickImage2(first: boolean) {
    launchCamera(
      {
        mediaType: 'photo',
        // selectionLimit: 1,
        includeBase64: true,
        // saveToPhotos: true,
      },
      response => {
        if (response.assets == undefined) return;
        this.setImage(
          first,
          response.assets[0].base64!,
          // Enum.ImageType.PRINTED,
          Enum.ImageType.LIVE,
        );
        this.faceMatchMethod();
      },
    );
  }

  setImage(first: boolean, base64: string, type: number) {
    if (base64 == null) return;
    this.setState({similarity: 'null'});
    if (first) {
      image1.bitmap = base64;
      image1.imageType = type;
      this.setState({img1: {uri: 'data:image/png;base64,' + base64}});
      this.setState({liveness: 'null'});
    } else {
      image2.bitmap = base64;
      image2.imageType = type;
      this.setState({img2: {uri: 'data:image/png;base64,' + base64}});
    }
  }

  matchFaces() {
    if (
      image1 == null ||
      image1.bitmap == null ||
      image1.bitmap == '' ||
      image2 == null ||
      image2.bitmap == null ||
      image2.bitmap == ''
    )
      return;
    // this.setState({similarity: 'Processing...'});

    var request = new MatchFacesRequest();
    request.images = [image1, image2];
    this.setState({isLoader: true});
    FaceSDK.matchFaces(
      JSON.stringify(request),
      json => {
        var response = MatchFacesResponse.fromJson(JSON.parse(json));
        FaceSDK.matchFacesSimilarityThresholdSplit(
          JSON.stringify(response!.results),
          0.75,
          str => {
            var split = MatchFacesSimilarityThresholdSplit.fromJson(
              JSON.parse(str),
            )!;
            // this.setState({
            //   similarity:
            //     split.matchedFaces!.length > 0
            //     &&(split.matchedFaces![0].similarity! * 100).toFixed(2) > 80
            //       ? alert('Face Match Successful')
            //       : alert('Face Does Not Match'),
            // });
            if (
              split.matchedFaces!.length > 0 &&
              (split.matchedFaces![0].similarity! * 100).toFixed(2) > 80
            ) {
              alert('Face Match Successful');
            } else {
              alert('Face Does Not Match');
            }
            this.setState({
              img1: require('./images/portrait.png'),
              img2: require('./images/portrait.png'),
              similarity: 'nil',
              liveness: 'nil',
              isLoader: false,
              matchData: 0,
            });
          },
          e => {
            this.setState({similarity: e});
          },
        );
      },
      e => {
        this.setState({similarity: e});
      },
    );
  }

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flexDirection: 'column',
            width: '100%',
            alignItems: 'center',
          }}>
          <View style={{padding: 3, width: '75%'}}>
            <TouchableOpacity
              onPress={() => this.faceMatchMethod()}
              style={{
                height: 40,
                width: 130,
                backgroundColor: '#4285F4',
                justifyContent: 'center',
                alignSelf: 'center',
              }}
              // disabled={this.state.similarity == null ? true : false}
            >
              {this.state.isLoader ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{textAlign: 'center', color: 'white'}}>MATCH</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    marginBottom: 12,
  },
  cameraContainer: {
    width: 300,
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  captureButton: {
    backgroundColor: 'blue',
    padding: 10,
    marginTop: 20,
    borderRadius: 5,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
});
