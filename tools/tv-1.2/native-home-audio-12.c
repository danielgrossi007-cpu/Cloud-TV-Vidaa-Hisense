/* Daniel Home 1.2 - altoparlante nativo (solo 127.0.0.1:8772).
   Novità rispetto al 12/11:
   - il dispositivo ALSA resta aperto e riceve silenzio quando non suona nulla: niente riapertura (era il ritardo)
     e niente fine del flusso a metà buffer (il PCM MStar ripeteva l'ultimo pezzetto: il "tutun");
   - latenza 60 ms invece di 100 ms;
   - mixer a 4 voci: un suono nuovo non taglia di colpo quello precedente;
   - dopo 10 minuti senza suoni il dispositivo si chiude; si riapre al suono successivo. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>
#include <grp.h>
#include <dlfcn.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <poll.h>
#include <time.h>
#include <errno.h>
#include <signal.h>
#define BASE "/APPS/daniel-native-audio-20261112"
#define VOICES 4
#define CHUNK 256
static const char *names[]={"move","select","back","home","saverIn","saverOut","intro"};
static int16_t *samples[7];static unsigned frames[7];
static long millis(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1000L+t.tv_nsec/1000000;}
int main(void){
 setbuf(stdout,NULL);signal(SIGPIPE,SIG_IGN);
 if(getuid()==0){gid_t group=3010;if(setgroups(1,&group)||setgid(3010)||setuid(314))return 10;}
 char token[80],path[256];FILE *f=fopen(BASE "/token","r");if(!f)return 11;if(!fgets(token,sizeof(token),f)){fclose(f);return 11;}fclose(f);token[strcspn(token,"\r\n")]=0;if(strlen(token)!=48)return 12;
 for(int i=0;i<7;i++){snprintf(path,sizeof(path),BASE "/%s.pcm",names[i]);f=fopen(path,"rb");if(!f)continue;fseek(f,0,SEEK_END);long n=ftell(f);rewind(f);if(n>0&&n<=960000&&n%4==0){samples[i]=malloc(n);if(samples[i]&&fread(samples[i],1,n,f)==(size_t)n)frames[i]=n/4;}fclose(f);}
 void *lib=dlopen("/basic/lib/libasound.so.2",RTLD_NOW|RTLD_LOCAL);if(!lib)return 13;
 int (*openpcm)(void**,const char*,int,int)=dlsym(lib,"snd_pcm_open");
 int (*params)(void*,int,int,unsigned,unsigned,int,unsigned)=dlsym(lib,"snd_pcm_set_params");
 long (*writepcm)(void*,const void*,unsigned long)=dlsym(lib,"snd_pcm_writei");
 int (*closepcm)(void*)=dlsym(lib,"snd_pcm_close"),(*prepare)(void*)=dlsym(lib,"snd_pcm_prepare"),(*drop)(void*)=dlsym(lib,"snd_pcm_drop");
 int (*format)(const char*)=dlsym(lib,"snd_pcm_format_value");
 int (*swalloc)(void**)=dlsym(lib,"snd_pcm_sw_params_malloc"),(*swcur)(void*,void*)=dlsym(lib,"snd_pcm_sw_params_current"),(*swstart)(void*,void*,unsigned long)=dlsym(lib,"snd_pcm_sw_params_set_start_threshold"),(*swset)(void*,void*)=dlsym(lib,"snd_pcm_sw_params");
 void (*swfree)(void*)=dlsym(lib,"snd_pcm_sw_params_free");
 if(!openpcm||!params||!writepcm||!closepcm||!prepare||!drop||!format||!swalloc||!swcur||!swstart||!swset||!swfree)return 14;
 int server=socket(AF_INET,SOCK_STREAM,0),one=1;setsockopt(server,SOL_SOCKET,SO_REUSEADDR,&one,sizeof(one));
 struct sockaddr_in addr={0};addr.sin_family=AF_INET;addr.sin_port=htons(8772);addr.sin_addr.s_addr=htonl(INADDR_LOOPBACK);
 if(bind(server,(void*)&addr,sizeof(addr))||listen(server,8))return 15;
 printf("READY 1.2 uid=%d gid=%d port=8772\n",getuid(),getgid());
 void *pcm=NULL;int vs[VOICES],vv[VOICES],lastError=0,opens=0;unsigned vo[VOICES];unsigned long requests=0,written=0,interrupts=0,underruns=0;long lastSound=0;
 for(int i=0;i<VOICES;i++)vs[i]=-1;
 int16_t buf[CHUNK*2];
 for(;;){
  struct pollfd pf={server,POLLIN,0};int available=poll(&pf,1,pcm?0:500);
  if(available>0&&(pf.revents&POLLIN)){
   int client=accept(server,NULL,NULL);if(client>=0){struct timeval timeout={0,200000};setsockopt(client,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));char request[1024]={0},url[256]={0},reply[768];int n=recv(client,request,sizeof(request)-1,0),status=403;char body[384]="{\"error\":\"forbidden\"}";
    if(n>0&&sscanf(request,"GET %255s",url)==1&&url[0]=='/'&&strncmp(url+1,token,48)==0&&url[49]=='/'){
     const char *cmd=url+50;
     if(strncmp(cmd,"status",6)==0){int act=0;for(int i=0;i<VOICES;i++)if(vs[i]>=0)act++;status=200;snprintf(body,sizeof(body),"{\"ready\":true,\"version\":\"1.2\",\"open\":%d,\"opens\":%d,\"active\":%d,\"requests\":%lu,\"framesWritten\":%lu,\"lastError\":%d,\"interrupts\":%lu,\"underruns\":%lu,\"uid\":%d,\"gid\":%d}",pcm?1:0,opens,act,requests,written,lastError,interrupts,underruns,getuid(),getgid());}
     else if(strncmp(cmd,"play/",5)==0){char name[24]={0};int vol=0;if(sscanf(cmd+5,"%23[^/]/%d",name,&vol)==2&&vol>=0&&vol<=100){for(int i=0;i<7;i++)if(strcmp(name,names[i])==0&&frames[i]){
       int slot=-1;unsigned best=0;
       for(int k=0;k<VOICES;k++)if(vs[k]==i){slot=k;interrupts++;break;}           /* lo stesso suono riparte da capo, mai due copie */
       if(slot<0)for(int k=0;k<VOICES;k++)if(vs[k]<0){slot=k;break;}
       if(slot<0)for(int k=0;k<VOICES;k++)if(vo[k]>=best){best=vo[k];slot=k;}       /* tutte occupate: sostituisce la più avanti */
       vs[slot]=i;vo[slot]=0;vv[slot]=vol;requests++;lastSound=millis();status=202;strcpy(body,"{\"queued\":true}");break;
      }}}
    }
    int len=snprintf(reply,sizeof(reply),"HTTP/1.1 %d OK\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: %u\r\n\r\n%s",status,(unsigned)strlen(body),body);send(client,reply,len,MSG_NOSIGNAL);close(client);
   }
  }
  int busy=0;for(int k=0;k<VOICES;k++)if(vs[k]>=0)busy=1;
  if(!pcm){
   if(!busy)continue;
   int rc=openpcm(&pcm,"sharespeakout",0,0);if(rc>=0)rc=params(pcm,format("S16_LE"),3,2,48000,0,60000);if(rc>=0){void *sw=NULL;rc=swalloc(&sw);if(rc>=0){rc=swcur(pcm,sw);if(rc>=0)rc=swstart(pcm,sw,1);if(rc>=0)rc=swset(pcm,sw);swfree(sw);}}
   if(rc<0){lastError=rc;if(pcm)closepcm(pcm);pcm=NULL;for(int k=0;k<VOICES;k++)vs[k]=-1;continue;}
   opens++;
  }
  if(!busy&&millis()-lastSound>600000){drop(pcm);closepcm(pcm);pcm=NULL;continue;}
  /* mix: le voci attive si sommano; senza voci si scrive silenzio (il flusso non si ferma mai) */
  for(int j=0;j<CHUNK*2;j++){
   int s=0;
   for(int k=0;k<VOICES;k++){if(vs[k]<0)continue;unsigned at=vo[k]*2+(unsigned)j;if(at<frames[vs[k]]*2)s+=(int)samples[vs[k]][at]*vv[k]/100;}
   if(s>32767)s=32767;else if(s<-32768)s=-32768;buf[j]=(int16_t)s;
  }
  long n=writepcm(pcm,buf,CHUNK);
  if(n>0){written+=n;lastError=0;for(int k=0;k<VOICES;k++)if(vs[k]>=0){vo[k]+=(unsigned)n;if(vo[k]>=frames[vs[k]])vs[k]=-1;}}
  else if(n==-32||n==-86){lastError=(int)n;underruns++;prepare(pcm);}
  else if(n==-11){struct pollfd z={-1,0,0};poll(&z,0,2);}
  else{lastError=(int)n;drop(pcm);closepcm(pcm);pcm=NULL;}
 }
}
