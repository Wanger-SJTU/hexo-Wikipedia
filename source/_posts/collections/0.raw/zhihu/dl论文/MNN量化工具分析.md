---
title: "MNN量化工具分析"
date: 2020-07-03
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/153562409

---

**MNN量化工具分析**
MNN提供了对模型进行量化版本的转化，相应的代码在tools/quantization目录下。

**量化工具使用方法**

**编译量化工具**
 cd MNN
 mkdir build
 cd build
 cmake -DMNN_BUILD_QUANTOOLS=ON ..
 make -j4

**工具使用**
 ./quantized.out origin.mnn quan.mnn preprocessConfig.json

- 第一个参数为原始模型文件路径，即待量化的浮点模型
- 第二个参数为目标模型文件路径，即量化后的模型
- 第三个参数为预处理的配置项，参考json配置
**Json 配置**
预处理配置文件格式如下：

 {
     &#34;format&#34;:&#34;RGB&#34;,
     &#34;mean&#34;:[
         127.5,
         127.5,
         127.5
     ],
     &#34;normal&#34;:[
         0.00784314,
         0.00784314,
         0.00784314
     ],
     &#34;width&#34;:224,
     &#34;height&#34;:224,
     &#34;path&#34;:&#34;path/to/images/&#34;,
     &#34;used_image_num&#34;:500,
     &#34;feature_quantize_method&#34;:&#34;KL&#34;,
     &#34;weight_quantize_method&#34;:&#34;MAX_ABS&#34;
 }
 ​

**format**
图片统一按RGBA读取，然后转换到`format`指定格式，可选：&#34;RGB&#34;, &#34;BGR&#34;, &#34;RGBA&#34;, &#34;GRAY&#34;。

**mean, normal**
模型预处理需要的`mean,normal`, 数据按此公式填写：​

**width, height**
模型输入的宽高

**path**
存放校正特征量化系数的图片目录

**used_image_num**
用于指定使用上述目录下多少张图片进行校正，默认使用`path`下全部图片

注意：请确保图片经过上述步骤处理之后的数据是输入到模型input接口的数据

**feature_quantize_method**
指定计算特征量化系数的方法，可选：

- &#34;KL&#34;: 使用KL散度进行特征量化系数的校正，一般需要100 ~ 1000张图片
- &#34;ADMM&#34;: 使用ADMM（Alternating Direction Method of Multipliers）方法进行特征量化系数的校正，一般需要一个batch的数据默认：&#34;KL&#34;
**weight_quantize_method**
指定权值量化方法，可选：

- &#34;MAX_ABS&#34;: 使用权值的绝对值的最大值进行对称量化
- &#34;ADMM&#34;: 使用ADMM方法进行权值量化默认：&#34;MAX_ABS&#34;上述特征量化方法和权值量化方法可进行多次测试，择优使用。

**量化模型的使用**
和浮点模型同样使用方法，输入输出仍然为浮点类型

**源码分析**

**入口主函数**
主函数main在quantized.cpp文件里

 int main(int argc, const char* argv[]) {
      . . .
     std::unique_ptr<MNN::NetT> netT;
     {// 读取原始的model文件， 借助于flattbuffer生成Net对象
         std::ifstream input(modelFile);
         std::ostringstream outputOs;
         outputOs << input.rdbuf();
         netT = MNN::UnPackNet(outputOs.str().c_str());
     }
 ​
     // temp build net for inference
     flatbuffers::FlatBufferBuilder builder(1024);
     auto offset = MNN::Net::Pack(builder, netT.get());
     builder.Finish(offset);
     int size      = builder.GetSize();
     auto ocontent = builder.GetBufferPointer();
 ​
     // 创两个buffer，两个都是放的二进制的模型数据
     std::unique_ptr<uint8_t> modelForInference(new uint8_t[size]);
     memcpy(modelForInference.get(), ocontent, size);
     std::unique_ptr<uint8_t> modelOriginal(new uint8_t[size]);
     memcpy(modelOriginal.get(), ocontent, size);
 ​
     netT.reset();
     netT = MNN::UnPackNet(modelOriginal.get());
 ​
     // 进行量化操作， 这个靠的是Calibration类
     DLOG(INFO) << &#34;Calibrate the feature and quantize model...&#34;;
     std::shared_ptr<Calibration> calibration(
         new Calibration(netT.get(), modelForInference.get(), size, preTreatConfig));
     calibration->runQuantizeModel();
     DLOG(INFO) << &#34;Quantize model done!&#34;;
     // 量化后的模型写入到FlatBufferBuilder
     flatbuffers::FlatBufferBuilder builderOutput(1024);
     builderOutput.ForceDefaults(true);
     auto len = MNN::Net::Pack(builderOutput, netT.get());
     builderOutput.Finish(len);
    // FlatBufferBuilder的内容写入文件，得到量化模型
     {
         std::ofstream output(dstFile);
         output.write((const char*)builderOutput.GetBufferPointer(), builderOutput.GetSize());
     }
 }

**Calibration类**
其声明在Calibration.hpp， 这个类是包含了一张图在量化过程中所需要的全部数据和操作， 理解了它，就理解了整个量化。

 class Calibration {
 public:
     // 参数 原始模型， 模型二进制buffer，和 配置文件
     Calibration(MNN::NetT* model, uint8_t* modelBuffer, const int bufferSize, const std::string& configPath);
     void runQuantizeModel(); // 完成量化过程的函数
 ​
 private:
     Calibration();
     MNN::NetT* _originaleModel; // 需要量化的模型 
     std::shared_ptr<MNN::CV::ImageProcess> _process; // 负责image到tensor的转化类
     const int _binNums = 2048;
     int _imageNum      = 0;  //  图片数量
     int _width;  // 输入的宽
     int _height;// 输入的高
     std::vector<std::string> _imgaes; //图片，用于校正特征量化系数的
 ​
     // Tensor and Info
     // tensor 到 对应的 TensorStatistic， TensorStatistic是描述tensor在量化过程中需要的统计数据
     std::map<const MNN::Tensor*, std::shared_ptr<TensorStatistic>> _featureInfo;
     std::map<int, const MNN::Tensor*> _tensorMap;// 所有的tensor
 ​
     // Op&#39;s name, Inputs, Outputs
     // op到  input/output tensor的映射
     std::map<std::string, std::pair<std::vector<MNN::Tensor*>, std::vector<MNN::Tensor*>>> _opInfo;
 ​
     // The scale results
     std::map<const MNN::Tensor*, std::vector<float>> _scales;
 ​
     std::shared_ptr<MNN::Interpreter> _interpreter;// 模型的解释器
     // keep mnn forward information
     MNN::Session* _session; // 做推理的session
     MNN::Tensor* _inputTensor; // 该模型的输入tensor
     std::vector<int> _inputTensorDims;
 ​
     std::string _featureQuantizeMethod = &#34;KL&#34;;
     std::string _weightQuantizeMethod  = &#34;MAX_ABS&#34;;
    // 根据模型，创建session
     void _initMNNSession(const uint8_t* modelBuffer, const int bufferSize, const int channels);
     void _initMaps();// 统计模型里的 tensor和op信息放到前面的map结构里
 ​
     void _computeFeatureMapsRange();
     void _collectFeatureMapsDistribution();
     void _computeFeatureScaleKL();
     void _computeFeatureScaleADMM();
     void _updateScale();
 ​
     // insert the dequantization op before the not supported op(int8), and insert dequantization op
     // after the output op, so that get original float data conveniently
     void _insertDequantize();
 };

**构造函数**

- 对配置文件json进行解析，得到参数。 解析json引用了三方库rapidjson
- 生成ImageProcess::config和ImageProcess对象（用于把image转成tensor）
- 创建session以及统计网络里tensor信息 Calibration::Calibration(MNN::NetT* model, uint8_t* modelBuffer, const int bufferSize, const std::string& configPath)
     : _originaleModel(model) {
     // when the format of input image is RGB/BGR, channels equal to 3, GRAY is 1
     int channles = 3;
  //  借助rapidjson 解析json
     rapidjson::Document document;
     {
         std::ifstream fileNames(configPath.c_str());
         std::ostringstream output;
         output << fileNames.rdbuf();
         auto outputStr = output.str();
         document.Parse(outputStr.c_str());
         if (document.HasParseError()) {
             MNN_ERROR(&#34;Invalid json\n&#34;);
             return;
         }
     }
     auto picObj = document.GetObject();
     ImageProcess::Config config; // 以json配置的内容为输入， 构造ImageProcess::config对象
     config.filterType = BILINEAR;
     config.destFormat = BGR;
     {
         if (picObj.HasMember(&#34;format&#34;)) {
             auto format = picObj[&#34;format&#34;].GetString();
             static std::map<std::string, ImageFormat> formatMap{{&#34;BGR&#34;, BGR}, {&#34;RGB&#34;, RGB}, {&#34;GRAY&#34;, GRAY}};
             if (formatMap.find(format) != formatMap.end()) {
                 config.destFormat = formatMap.find(format)->second;
             }
         }
     }
 ​
     if (config.destFormat == GRAY) {
         channles = 1;
     }
 ​
     config.sourceFormat = RGBA;
     std::string imagePath;
     _imageNum = 0;
     . . . .  // 省略了读取配置内容的代码
        //  生成ImageProcess对象
     std::shared_ptr<ImageProcess> process(ImageProcess::create(config));
     _process = process;
 ​
     // read images file names， 读取image，用于量化系数校正
     Helper::readImages(_imgaes, imagePath.c_str(), &_imageNum);
    // 创建session，做推理的
     _initMNNSession(modelBuffer, bufferSize, channles);
     _initMaps();// 创建tensor map，统计所有tensor
 }

这3个步骤里， 解析json和 ImageProcess比较明确，不用在细分。下面看看创建session和统计tensor的过程。

**_initMNNSession函数**
 void Calibration::_initMNNSession(const uint8_t* modelBuffer, const int bufferSize, const int channels) {
     _interpreter.reset(MNN::Interpreter::createFromBuffer(modelBuffer, bufferSize));
     // 根据原始模型数据，创建解释器Interpreter和session， 这部分在推理过程看过
     MNN::ScheduleConfig config;
     _session     = _interpreter->createSession(config);
     _inputTensor = _interpreter->getSessionInput(_session, NULL);
 ​
     // 输入数据格式的 处理  NHWC和NC4HW4
     _inputTensorDims.resize(4);
     auto inputTensorDataFormat = MNN::TensorUtils::getDescribe(_inputTensor)->dimensionFormat;
     DCHECK(4 == _inputTensor->dimensions()) << &#34;Only support 4 dimensions input&#34;;
     if (inputTensorDataFormat == MNN::MNN_DATA_FORMAT_NHWC) {
         _inputTensorDims[0] = 1;
         _inputTensorDims[1] = _height;
         _inputTensorDims[2] = _width;
         _inputTensorDims[3] = channels;
     } else if (inputTensorDataFormat == MNN::MNN_DATA_FORMAT_NC4HW4) {
         _inputTensorDims[0] = 1;
         _inputTensorDims[1] = channels;
         _inputTensorDims[2] = _height;
         _inputTensorDims[3] = _width;
     } else {
         DLOG(ERROR) << &#34;Input Data Format ERROR!&#34;;
     }
    // 使用KL散度， 或者ADMM进行特征量化系数校正
     if (_featureQuantizeMethod == &#34;KL&#34;) {
         _interpreter->resizeTensor(_inputTensor, _inputTensorDims);// input tensor的resize
         _interpreter->resizeSession(_session);// session的resize
     } else if (_featureQuantizeMethod == &#34;ADMM&#34;) {
         DCHECK((_imageNum * 4 * _height * _width) < (INT_MAX / 4)) << &#34;Use Little Number of Images When Use ADMM&#34;;
         _inputTensorDims[0] = _imageNum;
         _interpreter->resizeTensor(_inputTensor, _inputTensorDims);
         _interpreter->resizeSession(_session);
     }
     _interpreter->releaseModel();
 }

**_initMaps函数**
 void Calibration::_initMaps() {
     _featureInfo.clear(); // 清空各个数据
     _opInfo.clear();
     _tensorMap.clear();
     // MNN提供了每个op计算的callback， 一个计算前 一个是计算后
     //  计算前的callback完成的工作是 为input tensor创建TensorStatistic对象； opinfo的填充 op->input,output的映射
     MNN::TensorCallBackWithInfo before = [&](const std::vector<MNN::Tensor*>& nTensors, const MNN::OperatorInfo* info) {
         _opInfo[info->name()].first = nTensors;
         if (Helper::gNeedFeatureOp.find(info->type()) != Helper::gNeedFeatureOp.end()) {
             for (auto t : nTensors) {
                 if (_featureInfo.find(t) == _featureInfo.end()) {
                     _featureInfo[t] = std::shared_ptr<TensorStatistic>(
                         new TensorStatistic(t, _featureQuantizeMethod, info->name() + &#34;__input&#34;));
                 }
             }
         }
         return false;
     };
     // 计算后的callback完成的工作是  为output tensor创建TensorStatistic对象；opinfo的填充 op->input,output的映射
     MNN::TensorCallBackWithInfo after = [this](const std::vector<MNN::Tensor*>& nTensors,
                                                const MNN::OperatorInfo* info) {
         _opInfo[info->name()].second = nTensors;
         if (Helper::gNeedFeatureOp.find(info->type()) != Helper::gNeedFeatureOp.end()) {
             for (auto t : nTensors) {
                 if (_featureInfo.find(t) == _featureInfo.end()) {
                     _featureInfo[t] =
                         std::shared_ptr<TensorStatistic>(new TensorStatistic(t, _featureQuantizeMethod, info->name()));
                 }
             }
         }
         return true;
     };
     // 把网络跑一遍， 这样callback就执行了
     _interpreter->runSessionWithCallBackInfo(_session, before, after);
   // 遍历op， 由op的<input index， input>加入到 tensorMap。 
     for (auto& op : _originaleModel->oplists) {
         if (_opInfo.find(op->name) == _opInfo.end()) {
             continue;
         }
         //op的<input index， input>加入到 tensorMap。 
         for (int i = 0; i < op->inputIndexes.size(); ++i) {
             _tensorMap[op->inputIndexes[i]] = _opInfo[op->name].first[i];
         }//op的<output index， output>加入到 tensorMap。 
         for (int i = 0; i < op->outputIndexes.size(); ++i) {
             _tensorMap[op->outputIndexes[i]] = _opInfo[op->name].second[i];
         }
     }
     if (_featureQuantizeMethod == &#34;KL&#34;) {
         // set the tensor-statistic method of input tensor as THRESHOLD_MAX
         auto inputTensorStatistic = _featureInfo.find(_inputTensor);
         if (inputTensorStatistic != _featureInfo.end()) {
             inputTensorStatistic->second->setThresholdMethod(THRESHOLD_MAX);
         }
     }
 }

**理解TensorStatistic对象**
由于在Calibration实例里有个map包含了

 std::map<const MNN::Tensor*, std::shared_ptr<TensorStatistic>> _featureInfo;
这意味着，每个tensor都有一个TensorStatistic对象与之对应，TensorStatistic保存了一个tensor在量化过程中一些数据，要看一看。

 class TensorStatistic {
 public:
     TensorStatistic(const MNN::Tensor* tensor, std::string method, const std::string& name, int binNumber = 2048, GET_THRESHOLD_METHOD thresholdMethod = THRESHOLD_KL);
    .  .  .
     void updateRange();
     void resetDistribution();
     void updateDistribution();
     void setThresholdMethod(GET_THRESHOLD_METHOD thresholdMethod);
     void setChannelWise(bool mergeChannel);
     std::vector<float> finishAndCompute();
     // only this one for ADMM
     std::vector<float> computeScaleADMM();
 private:
     int _computeThreshold(const std::vector<float>& distribution);
     std::vector<std::pair<float, float>> mRangePerChannel;// 该tensor在每个channel上的最大最小值
     // 记  该channel上的 (取最大值绝对值， 取最小值的绝对值， 的最大值) 为maxValue
     std::vector<float> mIntervals;//每个channel上的interval = mBinNumber / maxValue
     std::vector<bool> mValidChannel; //如果channel上的maxValue>0.00001f, 为true
     std::vector<std::vector<float>> mDistribution;// 对于每个channel，tensor上浮点数据做均匀映射，映射到[0,mBinNumber]，统计各个整数出现次数， 形成了直方图。
 ​
     std::shared_ptr<MNN::Tensor> mHostTensor; // 该tensor在cpu端的表示
     const MNN::Tensor* mOriginTensor; // 原始的tensor
     int mBinNumber; //  默认是2048
     bool mUpdatedDistributionFlag = false;
     bool mUpdatedRangeFlags       = false;
 ​
     bool mMergeChannel                    = true;
     std::string mName;
     GET_THRESHOLD_METHOD mThresholdMethod = THRESHOLD_KL;
 };

**执行量化的过程**
执行量化的函数是Calibration::runQuantizeModel

 void Calibration::runQuantizeModel() {
     if (_featureQuantizeMethod == &#34;KL&#34;) { // 如果配置文件里是 KL散度做
         _computeFeatureScaleKL();
     } else if (_featureQuantizeMethod == &#34;ADMM&#34;) {// 如果配置文件里是ADMM
         _computeFeatureScaleADMM();
     }
     _updateScale();
     _insertDequantize();
 }

假设是KL散度，那么runQuantizeModel里的调用顺序是

- _computeFeatureScaleKL() 其中又是依次走下面3个步骤
- _computeFeatureMapsRange：计算
- _collectFeatureMapsDistribution
- 对每一个tensor做TensorStatistic::finishAndCompute， 计算出一个scale值
- _updateScale()进行op量化;
- _insertDequantize()插入反量化;
**理解KL散度计算过程**
 void Calibration::_computeFeatureScaleKL() {
     _computeFeatureMapsRange(); // 计算 feature map里的数据范围
     _collectFeatureMapsDistribution(); // 计算feature map里的数据分布
 ​
     _scales.clear();
     for (auto& iter : _featureInfo) {
         AUTOTIME;_imgaes
         _scales[iter.first] = iter.second->finishAndCompute();//缩放系数
     }
     //_featureInfo.clear();//No need now
 }

**计算featuremap的数据范围**
这个函数_computeFeatureMapsRange的作用就是，用指定的图片集合做为模型输入，做推理， 在推理过程中，每一个op的计算前后分别统计tensor的每一个channel上featuremap的最大值最小值， 更新到该tensor关联的TensorStatistic对象实例里

 void Calibration::_computeFeatureMapsRange() {
     // feed input data according to input images
     int count = 0;
     for (const auto& img : _imgaes) { // 对于每一个图片文件
         for (auto& iter : _featureInfo) {
             iter.second->resetUpdatedRangeFlags();
         }
         count++;
         // 读取图片，放到input tensor
         Helper::preprocessInput(_process.get(), _width, _height, img, _inputTensor);
         // 设置回调， 做推理时，每个op计算前，计算后分别调用
         MNN::TensorCallBackWithInfo before = [&](const std::vector<MNN::Tensor*>& nTensors,
                                                  const MNN::OperatorInfo* info) {
             for (auto t : nTensors) {
                 if (_featureInfo.find(t) != _featureInfo.end()) {
                     _featureInfo[t]->updateRange();// 统计输入tensor里的最大值最小值
                 }
             }
             return true;
         };
         MNN::TensorCallBackWithInfo after = [&](const std::vector<MNN::Tensor*>& nTensors,
                                                 const MNN::OperatorInfo* info) {
             for (auto t : nTensors) {
                 if (_featureInfo.find(t) != _featureInfo.end()) {
                     _featureInfo[t]->updateRange();// 统计输出tensor里的最大值最小值
                 }
             }
             return true;
         };
         // 推理一遍
         _interpreter->runSessionWithCallBackInfo(_session, before, after);
         MNN_PRINT(&#34;\rComputeFeatureRange: %.2lf %%&#34;, (float)count * 100.0f / (float)_imageNum);
         fflush(stdout);
     }
     MNN_PRINT(&#34;\n&#34;);
 }

**计算featuremap的数据分布**
该函数_collectFeatureMapsDistribution的作用是 计算每个tensor的 数据分布情况

 void Calibration::_collectFeatureMapsDistribution() {
     for (auto& iter : _featureInfo) {
         iter.second->resetDistribution(); // 初始化，清空TensorStatistic实例里的记录数据分布的属性
     }
     // 定义两个回调， 分别在op计算前 计算后执行
     // feed input data according to input images
     MNN::TensorCallBackWithInfo before = [&](const std::vector<MNN::Tensor*>& nTensors, const MNN::OperatorInfo* info) {
         for (auto t : nTensors) {
             if (_featureInfo.find(t) != _featureInfo.end()) {
                 _featureInfo[t]->updateDistribution(); // 对该input tensor的TensorStatistic实例更新数据分布
             }
         }
         return true;
     };
     MNN::TensorCallBackWithInfo after = [&](const std::vector<MNN::Tensor*>& nTensors, const MNN::OperatorInfo* info) {
         for (auto t : nTensors) {
             if (_featureInfo.find(t) != _featureInfo.end()) {
                 _featureInfo[t]->updateDistribution();// 对该output tensor的TensorStatistic实例更新数据分布
             }
         }
         return true;
     };
     int count = 0;
     for (const auto& img : _imgaes) {// 对所有的image，跑一遍推理
         count++;
         for (auto& iter : _fiter : _featureInfoeatureInfo) {
             iter.second->resetUpdatedDistributionFlag();
         }
         Helper::preprocessInput(_process.get(), _width, _height, img, _inputTensor); //读图片填到input
         _interpreter->runSessionWithCallBackInfo(_session, before, after); // 执行推理 
 ​
         MNN_PRINT(&#34;\rCollectFeatureDistribution: %.2lf %%&#34;, (float)count * 100.0f / (float)_imageNum);
         fflush(stdout);
     }
     MNN_PRINT(&#34;\n&#34;);
 }

每个tensor的数据分布初始化是在TensorStatistic的resetDistribution()方法

每个tensor的数据分布计算是在TensorStatistic的updateDistribution()方法

 void TensorStatistic::resetDistribution() { // 初始化分布
     for (int i = 0; i < mIntervals.size(); ++i) { // 在每一个channel上做运算
         int cIndex = i;
         if (mMergeChannel) {
             cIndex = 0;
         }
         // 最大值是 该channel上出现的数据的 绝对值的最大值
         auto maxValue         = std::max(fabsf(mRangePerChannel[cIndex].second), fabsf(mRangePerChannel[cIndex].first));
         mValidChannel[cIndex] = maxValue > 0.00001f;// 最大值要足够大， 然后除以mBinNumber=2048，得到mIntervals
         mIntervals[cIndex]    = 0.0f;
         if (mValidChannel[cIndex]) {
              // mIntervals 代表是 原始float均匀映射到 [0-2048)时， 整数1对应到浮点数上的值
             mIntervals[cIndex] = (float)mBinNumber / maxValue;
         }
     }
     for (auto& c : mDistribution) {
         std::fill(c.begin(), c.end(), 1.0e-07); // mDistribution初始值设为 接近0的很小的浮点数。
     }
 }
 ​
 void TensorStatistic::updateDistribution() {
     if (mUpdatedDistributionFlag) { //
         return;
     }
     mUpdatedDistributionFlag = true;
     // 取tensor上的数据， 和shape
     mOriginTensor->copyToHostTensor(mHostTensor.get());
     int batch   = mHostTensor->batch();
     int channel = mHostTensor->channel();
     int width   = mHostTensor->width();
     int height  = mHostTensor->height();
     auto area   = width * height;
 ​
     for (int n = 0; n < batch; ++n) {
         auto dataBatch = mHostTensor->host<float>() + n * mHostTensor->stride(0);// 取该batch上的数据
         for (int c = 0; c < channel; ++c) {// 对每一个channel维度上计算
             int cIndex = c;
             if (mMergeChannel) {
                 cIndex = 0;
             }
             if (!mValidChannel[cIndex]) {
                 continue;
             }
             auto multi       = mIntervals[cIndex];  // 取间隔值
             auto target      = mDistribution[cIndex].data();//取该channel上分布
             auto dataChannel = dataBatch + c * mHostTensor->stride(1);//取该channel上的feature map
             for (int v = 0; v < area; ++v) {
                 auto data = dataChannel[v]; // data是feature map上的数值点
                 if (data == 0) {
                     continue;
                 }
                 int index = static_cast<int>(fabs(data) * multi);// 该数值点 均匀映射到 整数点， 整数记为index
                 index     = std::min(index, mBinNumber - 1); // 限制范围是 不超过mBinNumber - 1
                 target[index] += 1.0f; // 统计到 mDistribution里
             }
         }
     }
 }

**计算缩放参数TensorStatistic::finishAndCompute**
这个函数作用是 计算出从浮点数到定点数的缩放参数

 std::vector<float> TensorStatistic::finishAndCompute() {
     std::vector<float> scaleValue(mDistribution.size(), 0.0f);
     . . . 
     for (int c = 0; c < mDistribution.size(); ++c) { // 对每一个channel
         if (!mValidChannel[c]) {
             continue;
         }
         float sum          = 0.0f;
         auto& distribution = mDistribution[c];
         std::for_each(distribution.begin(), distribution.end(), [&](float n) { sum += n; });// 求和
         std::for_each(distribution.begin(), distribution.end(), [sum](float& n) { n /= sum; }); // 除以和，等于占比， 相当于归一化了
 ​
         auto threshold = _computeThreshold(distribution); // 计算一个阈值
         scaleValue[c]  = ((float)threshold + 0.5) / mIntervals[c] / 127.0; // 计算缩放系数
     }
     return scaleValue;
 }

阈值计算， 找阈值使得KL散度最小

 // 找到一个使得kl散度最小的 Threshold
 int TensorStatistic::_computeThreshold(const std::vector<float>& distribution) {
     const int targetBinNums = 128;
     int threshold           = targetBinNums; // 默认128
 ​
     if (mThresholdMethod == THRESHOLD_KL) { // 如果是通过KL散度
         float minKLDivergence   = 10000.0f;
         float afterThresholdSum = 0.0f;
         //targetBinNums=128, mBinNumber=2048
         std::for_each(distribution.begin() + targetBinNums, distribution.end(),
                       [&](float n) { afterThresholdSum += n; });
         for (int i = targetBinNums; i < mBinNumber; ++i) { // i 从128 到 2047， 寻找潜在的threshold
             std::vector<float> quantizedDistribution(targetBinNums);
             std::vector<float> candidateDistribution(i);
             std::vector<float> expandedDistribution(i);
             // candidateDistribution是保留了 从0到i的分布， 同时把 i到mBinNumber直接的分布加到最后i-1位置
             std::copy(distribution.begin(), distribution.begin() + i, candidateDistribution.begin());
             candidateDistribution[i - 1] += afterThresholdSum;
             afterThresholdSum -= distribution[i];
             // 空间大小i 缩小到targetBinNums时的间隔。
             const float binInterval = (float)i / (float)targetBinNums;
 ​
             // merge i bins to target bins  j从0到127
             // 把0-i之间分布， 映射到更小空间 0-targetBinNums， 当然映射过后会有损失， 结果保存到quantizedDistribution
             for (int j = 0; j < targetBinNums; ++j) {
                 // [j,j+1)在mBinNumber空间
                 // [start, end]是 i空间 相对应的映射
                 const float start = j * binInterval;
                 const float end   = start + binInterval;
                 // 向上取整
                 const int leftUpper = static_cast<int>(std::ceil(start));
                 if (leftUpper > start) {
                     const float leftScale = leftUpper - start;
                     quantizedDistribution[j] += leftScale * distribution[leftUpper - 1];
                 }// 向下取整
                 const int rightLower = static_cast<int>(std::floor(end));
                 if (rightLower < end) {
                     const float rightScale = end - rightLower;
                     quantizedDistribution[j] += rightScale * distribution[rightLower];
                 }
                 // 转化成在[0, targetBinNums]分布
                 std::for_each(distribution.begin() + leftUpper, distribution.begin() + rightLower,
                               [&](float n) { quantizedDistribution[j] += n; });
             }
             // expand target bins to i bins 从小空间 0-targetBinNums 在反过来映射回来到0-i之间
             // 结果保存到expandedDistribution;
             for (int j = 0; j < targetBinNums; ++j) {
                 const float start   = j * binInterval;
                 const float end     = start + binInterval;
                 float count         = 0;
                 const int leftUpper = static_cast<int>(std::ceil(start));
                 float leftScale     = 0.0f;
                 if (leftUpper > start) {
                     leftScale = leftUpper - start;
                     if (distribution[leftUpper - 1] != 0) {
                         count += leftScale;
                     }
                 }
                 const int rightLower = static_cast<int>(std::floor(end));
                 float rightScale     = 0.0f;
                 if (rightLower < end) {
                     rightScale = end - rightLower;
                     if (distribution[rightLower] != 0) {
                         count += rightScale;
                     }
                 }
 ​
                 std::for_each(distribution.begin() + leftUpper, distribution.begin() + rightLower, [&](float n) {
                     if (n != 0) {
                         count += 1;
                     }
                 });
 ​
                 if (count == 0) {
                     continue;
                 }
                 const float toExpandValue = quantizedDistribution[j] / count;
                 if (leftUpper > start && distribution[leftUpper - 1] != 0) {
                     expandedDistribution[leftUpper - 1] += toExpandValue * leftScale;
                 }
                 if (rightLower < end && distribution[rightLower] != 0) {
                     expandedDistribution[rightLower] += toExpandValue * rightScale;
                 }
 ​
                 for (int k = leftUpper; k < rightLower; ++k) {
                     if (distribution[k] != 0) {
                         expandedDistribution[k] += toExpandValue;
                     }
                 }
             }
             // KL散度计算公式 Sum(P[i] * log(P[i] / Q[i]))
             const float curKL = _klDivergence(candidateDistribution, expandedDistribution);
             if (curKL < minKLDivergence) { // 记录最小的KL散度，以及使得KL散度最小的 threshold
                 minKLDivergence = curKL;
                 threshold       = i;
             }
         }
     } else if (mThresholdMethod == THRESHOLD_MAX) {
         threshold = mBinNumber - 1;
     } else {
         // TODO, support other method
         MNN_ASSERT(false);
     }
     return threshold;
 }

**op的量化_updateScale**
该函数完成的事情：对于图里的conv/Eltwise的op计算其定点版本的参数（权重，bias等），替代浮点版本参数

也就是完成了 可量化op的转化

 void Calibration::_updateScale() {
     for (const auto& op : _originaleModel->oplists) {
         const auto opType = op->type;
         // 只针对 conv， 或者Eltwise类型op
         if (opType != MNN::OpType_Convolution && opType != MNN::OpType_ConvolutionDepthwise &&
             opType != MNN::OpType_Eltwise) {
             continue;
         }
         auto tensorsPair = _opInfo.find(op->name);
         if (tensorsPair == _opInfo.end()) {
             MNN_ERROR(&#34;Can&#39;t find tensors for %s\n&#34;, op->name.c_str());
         }
 ​
         if (opType == MNN::OpType_Eltwise) {//Eltwise类型op
             auto param = op->main.AsEltwise();
             // Now only support AddInt8
             if (param->type != MNN::EltwiseType_SUM) {
                 continue;
             }
             // 取出前面算出来的 scale值
             const auto& inputScale0   = _scales[tensorsPair->second.first[0]];
             const auto& inputScale1   = _scales[tensorsPair->second.first[1]];
             const auto& outputScale   = _scales[tensorsPair->second.second[0]];
             const int outputScaleSize = outputScale.size();
             std::vector<float> outputInvertScale(outputScaleSize);
             Helper::invertData(outputInvertScale.data(), outputScale.data(), outputScaleSize);
             op->type = MNN::OpType_EltwiseInt8; // 修改op类型为量化版本
             op->main.Reset(); // 重新构造op的参数了
             op->main.type = MNN::OpParameter_EltwiseInt8;
 ​
             auto eltwiseInt8Param         = new MNN::EltwiseInt8T;
             auto input0ScaleParam         = new MNN::QuantizedFloatParamT;
             auto input1ScaleParam         = new MNN::QuantizedFloatParamT;
             auto outputScaleParam         = new MNN::QuantizedFloatParamT;
             input0ScaleParam->tensorScale = inputScale0;
             input1ScaleParam->tensorScale = inputScale1;
             outputScaleParam->tensorScale = outputInvertScale;
             // 从 定点数 恢复 浮点数需要的scale参数
             eltwiseInt8Param->inputQuan0  = std::unique_ptr<MNN::QuantizedFloatParamT>(input0ScaleParam);
             eltwiseInt8Param->inputQuan1  = std::unique_ptr<MNN::QuantizedFloatParamT>(input1ScaleParam);
             eltwiseInt8Param->outputQuan  = std::unique_ptr<MNN::QuantizedFloatParamT>(outputScaleParam);
             op->main.value                = eltwiseInt8Param;
             continue;
         }
 ​
         // below is Conv/DepthwiseConv
         const auto& inputScale  = _scales[tensorsPair->second.first[0]];
         const auto& outputScale = _scales[tensorsPair->second.second[0]];
 ​
         auto param                = op->main.AsConvolution2D();
         param->common->inputCount = tensorsPair->second.first[0]->channel();
         const int channles        = param->common->outputCount;
         const int weightSize      = param->weight.size();
         param->symmetricQuan.reset(new MNN::QuantizedFloatParamT);// 参数重置
         auto& quantizedParam = param->symmetricQuan;// 接着构建 定点版本参数
         quantizedParam->scale.resize(channles);
         quantizedParam->weight.resize(weightSize);
         quantizedParam->bias.resize(channles);
         // conv 和 deptwise_conv 分别算 weight，bias
         if (opType == MNN::OpType_Convolution) { 
             QuantizeConvPerChannel(param->weight.data(), param->weight.size(), param->bias.data(),
                                    quantizedParam->weight.data(), quantizedParam->bias.data(),
                                    quantizedParam->scale.data(), inputScale, outputScale, _weightQuantizeMethod);
             op->type = MNN::OpType_ConvInt8;
 ​
         } else if (opType == MNN::OpType_ConvolutionDepthwise) {
             QuantizeDepthwiseConv(param->weight.data(), param->weight.size(), param->bias.data(),
                                   quantizedParam->weight.data(), quantizedParam->bias.data(),
                                   quantizedParam->scale.data(), inputScale, outputScale, _weightQuantizeMethod);
             op->type = MNN::OpType_DepthwiseConvInt8;
         }
         if (param->common->relu6) {
             param->common->relu  = true;
             param->common->relu6 = false;
         }// 有了定点版本的参数， 原始的浮点参数就清空了
         param->weight.clear();
         param->bias.clear();
     }
 }

**添加反量化_insertDequantize**
这个函数作用是：添加反量化操作。 因为量化op输出是整数， 但是以量化op输出为输入的下一个op是浮点，需要是浮点版本输出，所以需要反量化的过程.

 void Calibration::_insertDequantize() {
     // Search All Int Tensors
     std::set<int> int8Tensors;
     std::set<int> int8Outputs;
     for (auto& op : _originaleModel->oplists) {// 遍历op
         if (Helper::INT8SUPPORTED_OPS.count(op->type) > 0) {//如果op是 int8量化的， 记录其input和output
             for (auto index : op->inputIndexes) {//记录其input
                 int8Tensors.insert(index);
             }
             for (auto index : op->outputIndexes) {//记录其output
                 int8Tensors.insert(index);
                 int8Outputs.insert(index);
             }
         }
     }
     for (auto& op : _originaleModel->oplists) {// 去重，tensor
         for (auto index : op->inputIndexes) {
             auto iter = int8Outputs.find(index);
             if (iter != int8Outputs.end()) {
                 int8Outputs.erase(iter);
             }
         }
     }
 ​
     // Insert Convert For Not Support Int8 Ops， 对于不支持int8的op，前后要加反量化的层
     for (auto iter = _originaleModel->oplists.begin(); iter != _originaleModel->oplists.end();) {
         auto op           = iter->get();
         const auto opType = op->type;
         const auto name   = op->name;
         // check whether is output op
         // if Yes, insert dequantization op after this op  支持int8的op,跳过
         if (Helper::INT8SUPPORTED_OPS.find(opType) != Helper::INT8SUPPORTED_OPS.end()) {
             // this is quantized op
             iter++;
             continue;
         }
 ​
         auto& inputIndexes  = op->inputIndexes;
         const int inputSize = inputIndexes.size();
 ​
         // insert dequantization op before this op
         for (int i = 0; i < inputSize; ++i) {// 对于该op的所有输入 tensor
             const auto curInputIndex = inputIndexes[i];
             if (int8Tensors.find(curInputIndex) == int8Tensors.end()) {// 如果该tensor不是量化版的，跳过
                 continue;
             }
             auto input        = _tensorMap[curInputIndex];
             auto inputOpScale = _scales[input];
 ​
             // construct new op， 创建一个 定点转浮点的 op
             auto dequantizationOp       = new MNN::OpT;
             dequantizationOp->main.type = MNN::OpParameter_QuantizedFloatParam;
             dequantizationOp->name      = &#34;___Int8ToFloat___For_&#34; + name + flatbuffers::NumToString(i);
             // 填充参数
             dequantizationOp->type           = MNN::OpType_Int8ToFloat;
             auto dequantizationParam         = new MNN::QuantizedFloatParamT;
             dequantizationOp->main.value     = dequantizationParam;
             dequantizationParam->tensorScale = inputOpScale;
 ​
             dequantizationOp->inputIndexes.push_back(curInputIndex);
             dequantizationOp->outputIndexes.push_back(_originaleModel->tensorName.size());
             _originaleModel->tensorName.push_back(dequantizationOp->name);
 ​
             // reset current op&#39;s input index at i， 新创建定点转浮点op的 输出 接到 op的输入
             inputIndexes[i] = dequantizationOp->outputIndexes[0];
             iter = _originaleModel->oplists.insert(iter, std::unique_ptr<MNN::OpT>(dequantizationOp));
             iter++;
         }
 ​
         iter++;
         // LOG(INFO) << &#34;insert quantization op after this op if neccessary&#34;;
         // insert quantization op after this op if neccessary
         //// 对于该op的所有输出tensor
         for (int i = 0; i < op->outputIndexes.size(); ++i) {
             const auto outputIndex = op->outputIndexes[i];
             if (int8Tensors.find(outputIndex) == int8Tensors.end()) { // 如果该tensor不是量化版本，跳过
                 continue;
             }
             auto output   = _tensorMap[outputIndex];
             auto curScale = _scales[output];
             // construct one quantization op(FloatToInt8)
             // 创建反量化的op
             auto quantizationOp        = new MNN::OpT;
             quantizationOp->main.type  = MNN::OpParameter_QuantizedFloatParam;
             quantizationOp->name       = name + &#34;___FloatToInt8___&#34; + flatbuffers::NumToString(i);
             quantizationOp->type       = MNN::OpType_FloatToInt8;
             auto quantizationParam     = new MNN::QuantizedFloatParamT;
             quantizationOp->main.value = quantizationParam;
              // 填充参数
             const int channels = curScale.size();
             std::vector<float> quantizationScale(channels);
             Helper::invertData(quantizationScale.data(), curScale.data(), channels);
             quantizationParam->tensorScale = quantizationScale;
             // 插入 反量化op到 该op后面
             quantizationOp->inputIndexes.push_back(_originaleModel->tensorName.size());
             quantizationOp->outputIndexes.push_back(outputIndex);
             _originaleModel->tensorName.push_back(_originaleModel->tensorName[outputIndex]);
             _originaleModel->tensorName[outputIndex] = quantizationOp->name;
             op->outputIndexes[i]                              = quantizationOp->inputIndexes[0];
 ​
             iter = _originaleModel->oplists.insert(iter, std::unique_ptr<MNN::OpT>(quantizationOp));
             iter++;
         }
     }
 ​
     // Insert Turn float Op for output
     for (auto index : int8Outputs) { // 对该图的 输出tensor，添加反量化， 因为图最终输出还是要浮点的
         // construct new op
         auto dequantizationOp       = new MNN::OpT;
         dequantizationOp->main.type = MNN::OpParameter_QuantizedFloatParam;
         dequantizationOp->name      = &#34;___Int8ToFloat___For_&#34; + flatbuffers::NumToString(index);
 ​
         dequantizationOp->type           = MNN::OpType_Int8ToFloat;
         auto dequantizationParam         = new MNN::QuantizedFloatParamT;
         dequantizationOp->main.value     = dequantizationParam;
         dequantizationParam->tensorScale = _scales[_tensorMap[index]];
 ​
         dequantizationOp->inputIndexes.push_back(index);
         dequantizationOp->outputIndexes.push_back(_originaleModel->tensorName.size());
         auto originTensorName              = _originaleModel->tensorName[index];
         _originaleModel->tensorName[index] = dequantizationOp->name;
         _originaleModel->tensorName.emplace_back(originTensorName);
 ​
         _originaleModel->oplists.insert(_originaleModel->oplists.end(), std::unique_ptr<MNN::OpT>(dequantizationOp));
     }
 }

简单收一下：

- 遍历op，找出所有被量化op的输入输出tensor
- 遍历op，找出所有 不能量化的op

- 如果该op的输入tensor是 量化op产生的， 那么需要输入后面加 反量化
- 如果该op的输出tensor是 给到量化op的， 那么需要在输出tensor后面加 量化

- 对于该图的输出tensor，后面加反量化， 确保输出结果是浮点的
**总结**

![](https://pic4.zhimg.com/v2-f9207b4649fe261d783c37c9f01eb53f_r.jpg)