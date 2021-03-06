/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 */

import {createThriftClient} from '../createThriftClient';
import thrift from 'thrift';
import EventEmitter from 'events';

// TODO: Handler unsubscription while connection ended

describe('createThriftClient', () => {
  let mockedClient;
  let mockedConnection;
  let mockServiceConfig;
  let mockPort;

  beforeEach(() => {
    mockServiceConfig = {
      name: 'thrift-mocked',
      remoteUri: '',
      remoteCommand: '',
      remoteCommandArgs: [],
      remotePort: 0,
      thriftTransport: 'buffered',
      thriftProtocol: 'binary',
      thriftService: {},
      killOldThriftServerProcess: true,
    };
    mockPort = 9000;

    mockedClient = {};
    class MockedConnection extends EventEmitter {
      end = jest.fn(() => this.emit('end'));
    }
    mockedConnection = new MockedConnection();
    jest
      .spyOn(thrift, 'createClient')
      .mockImplementationOnce(() => mockedClient);

    jest
      .spyOn(thrift, 'createConnection')
      .mockImplementationOnce(() => mockedConnection);
  });

  it('cannot get a closed client', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    client.close();
    expect(() => client.getClient()).toThrow('Cannot get a closed client');
  });

  it('successfully initialize a client', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    expect(client.getClient()).toBe(mockedClient);
  });

  it('cannot get a client after connection end', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    mockedConnection.emit('end');
    expect(() => client.getClient()).toThrow(
      'Cannot get a client because connection ended',
    );
  });

  it('successfully close a client', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    client.close();
    client.close();
    expect(mockedConnection.end).toHaveBeenCalledTimes(1);
  });

  it('fire connection end handler while manually close connection', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    const fn = jest.fn();
    client.onConnectionEnd(fn);
    client.close();
    client.close();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('fire connection end handler while connection is broken', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    const fn = jest.fn();
    client.onConnectionEnd(fn);
    mockedConnection.emit('end');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('handle unsubscription to connection end event', async () => {
    const client = await createThriftClient(mockServiceConfig, mockPort);
    const fn = jest.fn();
    const subscription = client.onConnectionEnd(fn);
    subscription.unsubscribe();
    client.close();
    expect(fn).not.toHaveBeenCalled();
  });
});
