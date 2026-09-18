---
title: KubeKey离线部署KubeSphere与Kubernetes实战
date: 2026-08-19
tags: [Kubernetes, KubeSphere, KubeKey, 离线部署, Harbor]
description: 本文是使用 KubeKey 在离线环境部署 KubeSphere v3.4.1 与 Kubernetes v1.26 的完整实战记录，涵盖 manifest 与 artifact 制作、Harbor 安装、集群部署及 9 大常见问题排查。
---

来源：C:\node\学无止境\k8s\安装文档.md（3 张控制台截图 + 完整操作文档）
主题：使用 KubeKey 在离线环境部署 KubeSphere + Kubernetes 集群的完整流程

### 0. 实战环境

#### 0.1 服务器规划

||||||||
|---|---|---|---|---|---|---|
|ksp-master-1|192.168.9.91|8|16|40|100|KubeSphere/k8s-master|
|ksp-master-2|192.168.9.92|8|16|40|100|KubeSphere/k8s-master|
|ksp-master-3|192.168.9.93|8|16|40|100|KubeSphere/k8s-master|
|ksp-registry|192.168.9.90|4|8|40|100|镜像仓库节点（Harbor）|
|ksp-deploy|192.168.9.89|4|8|40|100|联网主机用于制作离线包|
|合计|5 台|32|64|200|500||


#### 0.2 软件版本

|||
|---|---|
|操作系统|CentOS 7.9 x86_64|
|KubeSphere|v3.4.1|
|Kubernetes|v1.26.5|
|Containerd|1.6.4|
|KubeKey|v3.0.13|
|Harbor|2.5.3|


### 1. 简介：manifest 与 artifact

KubeKey v2.1.0+ 引入 清单 (manifest) 和 制品 (artifact) 概念，让离线部署 KubeSphere/K8s 集群变得简单。

|||
|---|---|
|manifest|描述集群信息 + 定义 artifact 应包含内容的文本文件|
|artifact|根据 manifest 导出的包含镜像 tar 包 + 二进制文件的 tgz 包|


部署流程：

KubeKey + manifest  ──→  artifact  ──→  离线部署 Harbor
                                         + KubeSphere
                                         + Kubernetes

生成 manifest 的两种方式：

||||
|---|---|---|
|现有运行集群生成|1:1 镜像集群|依赖已有集群|
|手写 manifest 模板（本文采用）|不依赖现有集群|需理解每项配置|


### 2. 离线部署资源制作

#### 2.1 准备联网制作节点



使用 ksp-deploy 节点制作离线包。该节点需联网下载 KK、依赖、镜像等。

#### 2.2 下载 KubeKey

```bash
cd ~
mkdir kubekey
cd kubekey/

# 选择中文区下载（GitHub 受限时使用）
export KKZONE=cn

# 下载最新版 kk
curl -sfL https://get-kk.kubesphere.io | sh -

# 或指定版本
curl -sfL https://get-kk.kubesphere.io | VERSION=v3.0.13 sh -
```

#### 2.3 获取 images-list

```bash
wget https://github.com/kubesphere/ks-installer/releases/download/v3.4.1/images-list.txt
```

官方 images-list 组成（136 个镜像）：

||||
|---|---|---|
|kubesphere-images|18|❌ 不可裁剪|
|kubeedge-images|3|✅ 取决于是否启用|
|gatekeeper-images|1|✅ 建议保留|
|openpitrix-images|1|✅ 建议保留|
|kubesphere-devops-images|45|✅ 带 builder-、tomcat85-、java-、nodejs-、python- 前缀的可以裁剪|
|kubesphere-monitoring-images|14|❌ 不可裁剪|
|kubesphere-logging-images|15|✅ elasticsearch- 和 opensearch- 开头的可裁剪|
|istio-images|9|✅ 建议保留|
|example-images|13|✅ 可裁剪|
|weave-scope-images|1|✅ 取决于是否启用|
|官方列表缺失的核心 images|12|❌ 缺则部署报错|
|官方列表缺失的必要 images|4|❌ 缺则部署报错|




重点：官方 images-list 缺失 16 个必要镜像（如 pause:3.8/3.9、kubectl:v1.22.0 等），必须手工补充！否则部署时各种 NotFound 报错。

#### 2.4 获取操作系统依赖包

```bash
# centos7 操作系统依赖包
wget https://github.com/kubesphere/kubekey/releases/download/v3.0.12/centos7-rpms-amd64.iso
```



注意：KK v3.0.13 release 中没包，只能在 v3.0.12 release 中下载。

```bash
# 验证文件
ll -h centos7-rpms-amd64.iso
# -rw-r--r--. 1 root root 315M  centos7-rpms-amd64.iso

# 验证 sha256sum（确保下载过程没出错）
sha256sum centos7-rpms-amd64.iso
# 2588fbc12acc9f3b95766a0c20382988f2a21da2a36e444b7e1a0f523e75f858
```

#### 2.5 生成 manifest 文件（ksp-v3.4.1-manifest.yaml）

```yaml
apiVersion: kubekey.kubesphere.io/v1alpha2
kind: Manifest
metadata:
  name: sample
spec:
  arches:
  - amd64
  operatingSystems:
  - arch: amd64
    type: linux
    id: centos
    version: "7"
    osImage: CentOS Linux 7 (Core)
    repository:
      iso:
        localPath: "/root/kubekey/centos7-rpms-amd64.iso"
        url:
  kubernetesDistributions:
  - type: kubernetes
    version: v1.26.5
  components:
    helm:       { version: v3.9.0 }
    cni:        { version: v1.2.0 }
    etcd:       { version: v3.4.13 }
    calicoctl:  { version: v3.26.1 }
  containerRuntimes:
  - type: docker
    version: 20.10.23
  - type: containerd
    version: 1.6.4
  crictl:           { version: v1.24.0 }
  docker-registry:  { version: "2" }
  harbor:           { version: v2.5.3 }
  docker-compose:   { version: v2.2.2 }
  images:
  # 136 个镜像（见原文完整列表）
  # 关键补充镜像（官方缺失 16 个）：
  - registry.cn-beijing.aliyuncs.com/kubesphereio/pause:3.8
  - registry.cn-beijing.aliyuncs.com/kubesphereio/pause:3.9
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kubectl:v1.22.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-apiserver:v1.26.5
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-controller-manager:v1.26.5
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-scheduler:v1.26.5
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-proxy:v1.26.5
  - registry.cn-beijing.aliyuncs.com/kubesphereio/k8s-dns-node-cache:1.15.12
  - registry.cn-beijing.aliyuncs.com/kubesphereio/coredns:1.9.3
  - registry.cn-beijing.aliyuncs.com/kubesphereio/kube-controllers:v3.26.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/cni:v3.26.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/node:v3.26.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/pod2daemon-flexvol:v3.26.1
  - registry.cn-beijing.aliyuncs.com/kubesphereio/haproxy:2.3
  - registry.cn-beijing.aliyuncs.com/kubesphereio/provisioner-localpv:3.3.0
  - registry.cn-beijing.aliyuncs.com/kubesphereio/linux-utils:3.3.0
  registry:
    auths: {}
```

manifest 修改说明：

|||
|---|---|
|镜像前缀|默认从 docker.io 拉取，本文替换为 registry.cn-beijing.aliyuncs.com/kubesphereio|
|harbor / docker-compose|必须开启（用 KK 自建 Harbor 推送镜像）|
|ISO localPath|填写提前下载的 centos7-rpms-amd64.iso 路径|
|ISO url|设为空（使用 localPath）|
|补充 16 个缺失镜像|缺则部署报错|


#### 2.6 导出制品 artifact

```bash
export KKZONE=cn
./kk artifact export -m ksp-v3.4.1-manifest.yaml -o ksp-v3.4.1-artifact.tar.gz
```

导出后目录（总大小约 14G）：

```bash
-rw-r--r--. 1 root root 315M  centos7-rpms-amd64.iso
-rwxr-xr-x. 1 root root  76M  kk
-rw-r--r--. 1 root root  13G   ksp-v3.4.1-artifact.tar.gz   ← 制品
-rw-r--r--. 1 root root  11K  ksp-v3.4.1-manifest.yaml
drwxr-xr-x. 3 root root  18   kubekey
-rw-r--r--. 1 root root  35M  kubekey-v3.0.13-linux-amd64.tar.gz
```

制品内部分布：

|||
|---|---|
|images|12G（主占比）|
|kube|207M|
|registry|660M|
|repository（OS 依赖）|315M|
|docker|130M|
|cni|102M|
|helm|45M|
|etcd|17M|
|containerd|43M|
|crictl|14M|
|runc|9M|




⚠️ 完整制品 13G，生产环境建议按需裁剪。

#### 2.7 打包 Kubekey

```bash
tar zcvf kubekey-v3.0.13.tar.gz kk kubekey-v3.0.13-linux-amd64.tar.gz
```

#### 2.8 升级包（可选）

```bash
wget https://mirrors.tuna.tsinghua.edu.cn/elrepo/kernel/el7/x86_64/RPMS/kernel-lt-5.4.263-1.el7.elrepo.x86_64.rpm
wget https://mirrors.tuna.tsinghua.edu.cn/elrepo/kernel/el7/x86_64/RPMS/kernel-lt-tools-libs-5.4.263-1.el7.elrepo.x86_64.rpm
wget https://mirrors.tuna.tsinghua.edu.cn/elrepo/kernel/el7/x86_64/RPMS/kernel-lt-tools-5.4.263-1.el7.elrepo.x86_64.rpm
tar zcvf kernel-lt-5.4.263-1-upgrade.tar.gz kernel-lt-*
```

#### 2.9 准备 3 个离线资源包

||||
|---|---|---|
|Kubekey|kubekey-v3.0.13.tar.gz|69M|
|制品|ksp-v3.4.1-artifact.tar.gz|13G|
|内核升级包（可选）|kernel-lt-5.4.263-1-upgrade.tar.gz|50M|


### 3. K8S 集群服务器初始化

#### 3.1 操作系统基础配置



KubeKey 可自动配置；生产环境建议手工按部署实战系列配置。

#### 3.2 数据盘配置（所有节点执行）

```bash
# 创建 PV
pvcreate /dev/sdb

# 创建 VG
vgcreate data /dev/sdb

# 创建 LV（使用全部空间）
lvcreate -l 100%VG data -n lvdata

# 格式化
mkfs.xfs /dev/mapper/data-lvdata

# 挂载
mkdir /data
mount /dev/mapper/data-lvdata /data/

# 配置开机自动挂载
tail -1 /etc/mtab >> /etc/fstab

# 创建 openebs 本地数据根目录
mkdir -p /data/openebs/local

# 创建 Containerd 数据目录 + 软连接
mkdir -p /data/containerd
ln -s /data/containerd /var/lib/containerd
```



说明：KubeKey 不支持部署时改 Containerd 数据目录，只能用软连接变通（也建议提前手工安装 Containerd）。

#### 3.3 升级系统内核（生产建议）

```bash
cd /root
tar xvf kernel-lt-5.4.263-1-upgrade.tar.gz

# 安装新内核（只装内核，不装其他包，否则会冲突）
yum install kernel-lt-5.4.263-1.el7.elrepo.x86_64.rpm

# 修改默认内核
grubby --set-default "/boot/vmlinuz-5.4.263-1.el7.elrepo.x86_64"

# 重启
reboot

# 验证
uname -r   # 5.4.263-1.el7.elrepo.x86_64
```

更新 kernel-tools（解决依赖冲突）：

```bash
# 卸载旧版本
yum remove kernel-tools-3.10.0-1160.71.1.el7.x86_64 \
              kernel-tools-libs-3.10.0-1160.71.1.el7.x86_64

# 安装新版本
yum install kernel-lt-tools-5.4.263-1.el7.elrepo.x86_64.rpm \
             kernel-lt-tools-libs-5.4.263-1.el7.elrepo.x86_64.rpm

# 清理
rm -rf kernel-lt-*.rpm
```

### 4. 离线部署前置准备

#### 4.1 上传离线资源包到部署节点

```bash
# 通常上传到 Master-1 的 /data/ 目录
mkdir /data/kubekey
mv /data/ksp-v3.4.1-artifact.tar.gz /data/kubekey/
tar xvf /data/kubekey-v3.0.13.tar.gz -C /data/kubekey
cd /data/kubekey
```

#### 4.2 创建离线集群配置文件

```bash
./kk create config --with-kubesphere v3.4.1 --with-kubernetes v1.26.5 \
  -f ksp-v341-v1265-offline.yaml
```

#### 4.3 修改 Cluster 配置

```yaml
apiVersion: kubekey.kubesphere.io/v1alpha2
kind: Cluster
metadata:
  name: sample
spec:
  hosts:
  - {name: ksp-master-1, address: 192.168.9.91, internalAddress: 192.168.9.91, port:22, user: root, password: "P@88w0rd"}
  - {name: ksp-master-2, address: 192.168.9.92, internalAddress: 192.168.9.92, user: root, password: "P@88w0rd"}
  - {name: ksp-master-3, address: 192.168.9.93, internalAddress: 192.168.9.93, user: root, password: "P@88w0rd"}
  - {name: ksp-registry, address: 192.168.9.90, internalAddress: 192.168.9.90, user: root, password: "P@88w0rd"}
  roleGroups:
    etcd:          [ksp-master-1, ksp-master-2, ksp-master-3]
    control-plane: [ksp-master-1, ksp-master-2, ksp-master-3]
    worker:        [ksp-master-1, ksp-master-2, ksp-master-3]
    registry:      [ksp-registry]
  controlPlaneEndpoint:
    internalLoadbalancer: haproxy
    domain: lb.opsman.top
    address: ""
    port: 6443
  kubernetes:
    version: v1.26.5
    clusterName: opsman.top
    autoRenewCerts: true
  containerManager: containerd
  etcd: { type: kubekey }
  network:
    plugin: calico
    kubePodsCIDR: 10.233.64.0/18
    kubeServiceCIDR: 10.233.0.0/18
    multusCNI: { enabled: false }
  storage:
    openebs:
      basePath: /data/openebs/local
  registry:
    type: harbor
    auths:
      "registry.opsman.top":
        username: admin
        password: Harbor12345
    certsPath: "/etc/docker/certs.d/registry.opsman.top"
    privateRegistry: "registry.opsman.top"
    namespaceOverride: "kubesphereio"
    registryMirrors: []
    insecureRegistries: []
  addons: []
```

关键配置说明：

|||
|---|---|
|hosts|节点 IP/SSH 端口/用户/密码|
|roleGroups|3 节点同时作为 etcd/control-plane/worker|
|registry|必须指定为 Harbor 类型|
|internalLoadbalancer: haproxy|启用内置 HAProxy|
|storage.openebs.basePath|新增配置，指定 openebs 存储路径|
|namespaceOverride: kubesphereio|必须（否则命名空间不匹配）|


#### 4.4 修改 ClusterConfiguration 配置

```yaml
spec:
  etcd:        { monitoring: true, endpointIps: localhost, port: 2379, tlsEnable: true }
  openpitrix:  { store: { enabled: true } }                # 启用应用商店
  devops:      { enabled: true }                          # 启用 DevOps
  logging:     { enabled: true }                          # 启用日志（v3.4.0 默认 OpenSearch）
  events:      { enabled: true }                          # 启用事件系统
  alerting:    { enabled: true }                          # 启用告警
  auditing:    { enabled: true }                          # 启用审计
  servicemesh: { enabled: true }                          # 启用服务网格（Istio）
    istio:
      components:
        ingressGateways:
        - { name: istio-ingressgateway, enabled: false }
        cni: { enabled: false }
  metrics_server: { enabled: true }                      # 启用 Metrics Server
  network:                                             # 网络策略
    networkpolicy: { enabled: true }
    ippool:        { type: calico }
    topology:      { type: weave-scope }
  namespace_override: kubesphereio                       # 关键参数（防止 namespace 不匹配）
```

### 5. 安装配置 Harbor

#### 5.1 安装 Harbor

```bash
cd /root/kubekey
./kk init registry -f ksp-v341-v1265-offline.yaml -a ksp-v3.4.1-artifact.tar.gz
```

部署完成后 SSH 到 Registry 节点验证：

```bash
# 查看安装结果
ls -lh /opt/harbor/

# 查看运行镜像
docker images
```

Harbor v2.5.3 默认账号：

|||
|---|---|
|密码|Harbor12345（生产必须改）|
|安装目录|/opt/harbor|


自动同步自签名证书：KK 部署 Harbor 时自动复制证书到所有节点（InitRegistryModule 步骤）。自建 Harbor 必须手动复制证书。

#### 5.2 在 Harbor 中创建项目

由于 Harbor RBAC 限制，未创建项目则镜像不能推送。

项目类型：

|||
|---|---|
|Public（公开）|任何用户|
|Private（私有）|仅项目成员|


自动创建脚本（create_project_harbor.sh）：

```bash
#!/usr/bin/env bash
url="https://registry.opsman.top"
user="admin"
passwd="Harbor12345"

# 必须包含 kubesphereio（默认没有）
harbor_projects=(library kubesphere calico coredns openebs csiplugin minio \
    mirrorgooglecontainers osixia prom thanosio jimmidyson grafana elastic \
    istio jaegertracing jenkins weaveworks openpitrix joosthofman nginxdemos \
    fluent kubeedge kubesphereio)

for project in "${harbor_projects[@]}"; do
  echo "creating $project"
  curl -k -u "${user}:${passwd}" -X POST -H "Content-Type: application/json" \
    "${url}/api/v2.0/projects" \
    -d "{ \"project_name\": \"${project}\", \"public\": true}"
done

# 执行
sh create_project_harbor.sh
```



⚠️ harbor_projects 中一定要新增 kubesphereio，默认没有，不加后面报错（问题 2）。

配图内容描述：Harbor 管理页面 → 项目列表，显示 24 个公开项目（calico/coredns/openebs/kubesphereio 等），kubesphereio 包含 118 个镜像仓库，使用存储 11.45 GiB。

#### 5.3 推送离线镜像到 Harbor（可选）

```bash
./kk artifact image push -f ksp-v341-v1265-offline.yaml -a ksp-v3.4.1-artifact.tar.gz
```

配图内容描述：Harbor 仓库的 kubesphereio 项目下，已推送全部 118 个 KubeSphere 相关镜像。

### 6. 安装 KubeSphere + Kubernetes 集群

#### 6.1 部署集群

```bash
./kk create cluster \
  -f ksp-v341-v1265-offline.yaml \
  -a ksp-v3.4.1-artifact.tar.gz \
  --with-packages \
  --skip-push-images
```

|||
|---|---|
|-f|离线集群配置文件|
|-a|制品包 tar|
|--with-packages|安装 OS 依赖|
|--skip-push-images|跳过镜像推送（前面已推送）|


检查合格后会提示确认安装 → 输入 yes 继续。



⚠️ 启用日志插件（opensearch）时必须按"问题 6"手工介入处理，否则安装失败。

部署完成约 10-30 分钟（取决于网速、机器配置、启用插件数）。

成功输出：

```
########################################################
              Welcome to KubeSphere!
########################################################
Console: http://192.168.9.91:30880
Account: admin
Password: P@88w0rd
########################################################
Installation is complete.
```

实时监控命令（另开终端）：

```bash
# 查看所有 pod
kubectl get pod -A
# 查看非 Running 的 pod
kubectl get pod -A | grep -v Running
# 查看详细部署日志
kubectl logs -n kubesphere-system $(kubectl get pod -n kubesphere-system \
  -l 'app in (ks-install, ks-installer)' -o jsonpath='{.items[0].metadata.name}') -f
```

#### 6.2 验证部署结果

- 登录 Web 控制台：http://<IP>:30880，默认账户 admin/P@88w0rd
- 首次登录后请修改默认密码
配图内容描述：

- 集群节点状态：3 个 master 节点全部 Ready，角色 control-plane/etcd/worker
- 系统组件状态：KubeSphere 核心组件（apiserver/console/controller-manager）全部 Running
### 7. 常见问题排查（9 大问题）

|||||
|---|---|---|---|
|1|create_project_harbor.sh 报 curl 证书验证失败|Harbor HTTPS + 自签名证书|curl 命令加 -k 参数|
|2|推镜像报 get manifest list failed by module cache|未创建 kubesphereio 项目|在 Harbor 创建 kubesphereio 项目|
|3|部署时 x509: certificate signed by unknown authority|containerd 不认 Harbor 证书|certsPath 字段配置 + containerd 配置中加 TLS 段|
|4|no such file or directory: registry.opsman.top.cert|官方 images-list 缺 pause:3.8/3.9 等|手动补充 16 个缺失镜像到 manifest|
|5|metrics-server ImagePullBackOff (not found)|namespace 不匹配 bug|ClusterConfiguration 加 namespace_override: kubesphereio|
|6|opensearch 拉 busybox:latest 失败（DNS 解析超时）|配置写死 busybox 镜像地址|kubectl edit sts 把 busybox 改成本地镜像|
|7|pause:3.9: not found|缺镜像|同问题 4|
|8|拉镜像报 no space left on device|Master-1 系统盘满了（40G）|离线资源包放数据盘，不要放系统盘|
|9|argocd-dex-server 反复重启|探活失败（未深究）|临时方案：kubectl delete pod 自动重建|


#### 7.1 重点：containerd 证书配置（问题 3 修复）

```
# /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".registry.configs."registry.opsman.top".tls]
  ca_file = "/etc/docker/certs.d/registry.opsman.top/ca.crt"
  cert_file = "/etc/docker/certs.d/registry.opsman.top/registry.opsman.top.cert"
  key_file = "/etc/docker/certs.d/registry.opsman.top/registry.opsman.top.key"
  insecure_skip_verify = false

systemctl restart containerd
```

### 8. 总结

关键收获：

- ✅ 理解 KubeKey 的 manifest 和 artifact 概念
- ✅ 掌握 manifest + images-list 资源的获取方法
- ✅ 了解 images-list 组成（136 个镜像 + 16 个补充）+ 裁剪方案
- ✅ 手工编写完整 manifest 清单
- ✅ 制作 artifact 制品包（13G）
- ✅ 离线部署 Harbor（含自签名证书同步）
- ✅ Harbor 仓库自动创建 24 个项目
- ✅ 离线部署完整 KubeSphere + Kubernetes 集群
- ✅ 掌握 9 大常见问题的根因与解决方案
最关键的 3 个坑：

- 官方 images-list 缺失 16 个镜像（尤其 pause:3.8/3.9）→ 必须手动补
- Harbor 缺 kubesphereio 项目 → 必创建
- ClusterConfiguration 缺 namespace_override → 必加

整理版本：v1.0 · 2026-08-19
配图：4 张 Harbor/KubeSphere 控制台截图已转化为文字描述嵌入正文
