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

import thrift from 'thrift';
import RemoteFileSystemService from './gen-nodejs/RemoteFileSystemService';
import {RemoteFileSystemServiceHandler} from './RemoteFileSystemServiceHandler';
import {scanPortsToListen} from '../../common/ports';
import {getLogger} from 'log4js';
import {WatchmanClient} from 'nuclide-watchman-helpers';

/**
 * Wrapper class of raw thrift server which provide more methods
 * e.g. initialze(), close() etc.
 */
export class RemoteFileSystemServer {
  _serviceHandler: RemoteFileSystemServiceHandler;
  _server: thrift.Server;
  _port: number;
  _logger: log4js$Logger;
  _watcher: WatchmanClient;

  constructor(port: number) {
    this._port = port;
    this._logger = getLogger('fs-thrift-server');
    this._watcher = new WatchmanClient();
    this._serviceHandler = new RemoteFileSystemServiceHandler(this._watcher);
  }

  async initialize(): Promise<void> {
    if (this._server != null) {
      return;
    }
    this._server = thrift.createServer(RemoteFileSystemService, {
      watch: (uri, options) => {
        return this._serviceHandler.watch(uri, options);
      },
      pollFileChanges: () => {
        return this._serviceHandler.pollFileChanges();
      },
      createDirectory: uri => {
        return this._serviceHandler.createDirectory(uri);
      },
      stat: uri => {
        return this._serviceHandler.stat(uri);
      },
      readFile: uri => {
        return this._serviceHandler.readFile(uri);
      },
      writeFile: (uri, content, options) => {
        return this._serviceHandler.writeFile(uri, content, options);
      },
      rename: (oldUri, newUri, options) => {
        return this._serviceHandler.rename(oldUri, newUri, options);
      },
      copy: (source, destination, options) => {
        return this._serviceHandler.copy(source, destination, options);
      },
      deletePath: (uri, options) => {
        return this._serviceHandler.deletePath(uri, options);
      },
      readDirectory: uri => {
        return this._serviceHandler.readDirectory(uri);
      },
    });
    this._server.on('error', error => {
      throw error;
    });
    const isServerListening = await scanPortsToListen(
      this._server,
      String(this._port),
    );
    if (!isServerListening) {
      throw new Error(`All ports in range "${this._port}" are already in use`);
    }
  }

  getPort(): number {
    return this._server.address().port;
  }

  close() {
    this._logger.info('Close remote file system thrift service server...');
    this._server = null;
    this._watcher.dispose();
  }
}
