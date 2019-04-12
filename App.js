import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { AuthSession } from 'expo';

export default class App extends React.Component {

  state = {
    result: null,
    authenticated: false,
    invoices: [],
  };

  render() {
    return (
      <View style={styles.container}>
        {!this.state.authenticated && <Button title="Login with Cozy" onPress={this._handlePressAsync} />}
        {this.state.authenticated && <Text>{
          this.state.invoices.map(invoice => invoice.doc.vendor).join('\n')
        }</Text>}
        </View>
    );
  }

  _handlePressAsync = async () => {
    const redirectUrl = AuthSession.getRedirectUrl();
    console.log(redirectUrl)
    const baseUrl = 'https://sebprunier.mycozy.cloud';

    fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "redirect_uris": [ redirectUrl ],
        "client_name": "cozy-third-party-mobileapp-demo",
        "software_id": "github.com/sebprunier/cozy-third-party-mobileapp-demo"
      })
    }).then(r => r.json()).then(conf => {
      const state = '123456';
      const scope = 'io.cozy.bills:GET io.cozy.files:GET';
      const authUrl = `${baseUrl}/auth/authorize?state=${state}&scope=${encodeURIComponent(scope)}&client_id=${conf.client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}`
      console.log(authUrl);
      return AuthSession.startAsync({
        authUrl
      }).then(result => {
        this.setState({ result });
        fetch(`${baseUrl}/auth/access_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: `state=${state}&code=${result.params.code}&grant_type=authorization_code&client_id=${conf.client_id}&client_secret=${conf.client_secret}&redirect_uri=${encodeURIComponent(redirectUrl)}`
        }).then(r => r.json()).then(resp => {
          console.log('fetchAccessToken resp', resp)
          this.setState({
            accessToken: resp.access_token,
            refreshToken: resp.refresh_token,
            authenticated: true,
          })
          fetch(`${baseUrl}/data/io.cozy.bills/_all_docs?include_docs=true`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.state.accessToken}`,
              'Accept': 'application/json'
            }
          })
          .then(r => r.json())
          .then(json => {
            console.log(json);
            this.setState({
              invoices: json.rows,
            })
          })
        }).catch(e => {
          console.log('error while fetchAccessToken', e)
        });
      });
    });
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});