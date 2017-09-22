import {ApplicationRef, Injectable} from '@angular/core';
import {ChatStateService} from './chat.state.service';
import {URL} from '../../environments/environment';
import {User, Notification} from './interfaces';

/**
 * Web Sockets Configuration
 * Two controllers for monitoring notification from server
 * @author by Alexander Prendota on 20.09.2017.
 */

declare const SockJS: any;
declare const Stomp: any;

@Injectable()
export class WebSocketsService {

  stompClient: any;

  constructor(public chatService: ChatStateService,
              private ref: ApplicationRef) {

  }

  connect(callback) {
    const that = this;
    const socket = new SockJS(URL.endPointSockets);
    this.stompClient = Stomp.over(socket);
    this.stompClient.connect({}, function (frame) {
      console.log('Connected: ' + frame);

      /**
       * First controller for updating current users
       *
       * active = true => new user logged in
       * active = false => user logged out
       */
      that.stompClient.subscribe('/topic/reload', function (responseMessage) {
        const userDto: User = JSON.parse(responseMessage.body);
        if (userDto.active === false) {
          // TODO: fix to array.slice(index, 1)
          // that.chatService.activeUsers.filter(function (entry) {
          //   return entry.id !== userDto.id;
          // });
          that.chatService.initActiveUsers();
        } else if (userDto.id !== that.chatService.owner.id && that.chatService.owner.id !== -1 &&
          !that.chatService.activeUsers.includes(userDto)) {
          that.chatService.activeUsers.push(userDto);
        }
        that.ref.tick();
      });

      /**
       * Second controller for monitoring messages
       */
      that.stompClient.subscribe('/topic/message', function (responseMessage) {
        const notification: Notification = JSON.parse(responseMessage.body);
        if (notification.recipient == that.chatService.owner.id) {
          that.chatService.updateMessage(notification.idMessage);
          that.ref.tick();
        }
      });
      callback();
    }, function (error) {
      console.log('So sad: ', error);
    });
  }

  send(url, data) {
    this.stompClient.send(url, {}, JSON.stringify(data));
  }

}
